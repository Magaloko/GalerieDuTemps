import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import {
  customerTelegramTokenGenerieren,
  customerTelegramVerknuepfen,
  customerByTelegramChatId,
  customerTelegramLoesen,
  customerTelegramNotificationsToggle,
} from "../db/customer-telegram";

/**
 * DB-Layer-Tests für Telegram-Customer-Verknüpfung (sql/024).
 *
 * Sicherheits-kritisch: Token-Race-Conditions, Cross-Customer-Lookups.
 */

describe.skipIf(!testDbAvailable())("db/customer-telegram (Integration)", () => {
  let customerA: string;
  let customerB: string;

  beforeAll(async () => {
    await setupTestSchema();
    __setPoolForTesting(getTestPool());
  });

  afterAll(async () => {
    __setPoolForTesting(null);
    await teardownTestDb();
  });

  beforeEach(async () => {
    const p = getTestPool()!;
    await p.query(`TRUNCATE sebo.customers RESTART IDENTITY CASCADE`);
    const a = await p.query<{ id: string }>(
      `INSERT INTO sebo.customers (email, vorname, customer_type)
       VALUES ('a@test.kz', 'Alice', 'b2c') RETURNING id`,
    );
    const b = await p.query<{ id: string }>(
      `INSERT INTO sebo.customers (email, vorname, customer_type)
       VALUES ('b@test.kz', 'Bob', 'b2c') RETURNING id`,
    );
    customerA = a.rows[0].id;
    customerB = b.rows[0].id;
  });

  describe("customerTelegramTokenGenerieren", () => {
    it("generiert Token und speichert ihn am Customer", async () => {
      const t = await customerTelegramTokenGenerieren(customerA);
      expect(t).toMatch(/^[a-f0-9]{48}$/);  // 48-char hex per Implementation

      // DB-Verify
      const r = await getTestPool()!.query<{ telegram_link_token: string }>(
        `SELECT telegram_link_token FROM sebo.customers WHERE id = $1`,
        [customerA],
      );
      expect(r.rows[0].telegram_link_token).toBe(t);
    });

    it("liefert existierendes Token bei 2. Aufruf (kein Re-Generate)", async () => {
      const t1 = await customerTelegramTokenGenerieren(customerA);
      const t2 = await customerTelegramTokenGenerieren(customerA);
      expect(t2).toBe(t1);  // selbes Token, race-safe
    });

    it("verschiedene Customers haben verschiedene Tokens", async () => {
      const ta = await customerTelegramTokenGenerieren(customerA);
      const tb = await customerTelegramTokenGenerieren(customerB);
      expect(ta).not.toBe(tb);
    });
  });

  describe("customerTelegramVerknuepfen", () => {
    it("Token einlösen setzt chat_id + username + löscht Token", async () => {
      const token = await customerTelegramTokenGenerieren(customerA);
      const customer = await customerTelegramVerknuepfen(token, 12345, "alice_tg");
      expect(customer).toBeTruthy();
      expect(customer!.id).toBe(customerA);
      expect(customer!.telegram_chat_id).toBe(12345);
      expect(customer!.telegram_username).toBe("alice_tg");
      expect(customer!.telegram_link_token).toBeNull();   // Token gelöscht
      expect(customer!.telegram_verknuepft_am).toBeTruthy();
    });

    it("ungültiges Token → null", async () => {
      const customer = await customerTelegramVerknuepfen("nonexistent-token-xyz", 99, null);
      expect(customer).toBeNull();
    });

    it("Token kann nur EINMAL eingelöst werden (Race-Safe)", async () => {
      const token = await customerTelegramTokenGenerieren(customerA);

      const [first, second] = await Promise.all([
        customerTelegramVerknuepfen(token, 100, "user1"),
        customerTelegramVerknuepfen(token, 200, "user2"),
      ]);

      // Exact one wins, the other gets null
      const wins = [first, second].filter(c => c !== null).length;
      expect(wins).toBe(1);
    });

    it("Token darf nicht von zweitem Customer verwendet werden", async () => {
      const tokenA = await customerTelegramTokenGenerieren(customerA);
      // Customer B verknüpft sein Telegram nicht — nur tokenA existiert
      const result = await customerTelegramVerknuepfen(tokenA, 999, "anyone");
      expect(result!.id).toBe(customerA);  // korrekt nur an A geknüpft
      // B unverändert
      const b = await getTestPool()!.query<{ telegram_chat_id: number | null }>(
        `SELECT telegram_chat_id FROM sebo.customers WHERE id = $1`,
        [customerB],
      );
      expect(b.rows[0].telegram_chat_id).toBeNull();
    });

    it("UNIQUE chat_id verhindert dass derselbe Telegram-User 2 Accounts hat", async () => {
      const tokenA = await customerTelegramTokenGenerieren(customerA);
      const tokenB = await customerTelegramTokenGenerieren(customerB);

      // A verknüpft sich
      const ra = await customerTelegramVerknuepfen(tokenA, 12345, "shared");
      expect(ra).toBeTruthy();

      // B versucht mit DERSELBEN chat_id — sollte fehlschlagen (UNIQUE)
      const rb = await customerTelegramVerknuepfen(tokenB, 12345, "shared");
      expect(rb).toBeNull();  // Code returned null bei Constraint-Violation
    });
  });

  describe("customerByTelegramChatId", () => {
    it("findet Customer per chat_id", async () => {
      const token = await customerTelegramTokenGenerieren(customerA);
      await customerTelegramVerknuepfen(token, 42, "alice");
      const c = await customerByTelegramChatId(42);
      expect(c!.id).toBe(customerA);
    });

    it("unbekannte chat_id → null", async () => {
      const c = await customerByTelegramChatId(99_999_999);
      expect(c).toBeNull();
    });
  });

  describe("customerTelegramLoesen", () => {
    it("löscht chat_id + username + verknuepft_am komplett", async () => {
      const token = await customerTelegramTokenGenerieren(customerA);
      await customerTelegramVerknuepfen(token, 42, "alice");
      await customerTelegramLoesen(customerA);

      const r = await getTestPool()!.query(
        `SELECT telegram_chat_id, telegram_username, telegram_verknuepft_am, telegram_link_token
         FROM sebo.customers WHERE id = $1`,
        [customerA],
      );
      const row = r.rows[0];
      expect(row.telegram_chat_id).toBeNull();
      expect(row.telegram_username).toBeNull();
      expect(row.telegram_verknuepft_am).toBeNull();
      expect(row.telegram_link_token).toBeNull();
    });
  });

  describe("customerTelegramNotificationsToggle", () => {
    it("toggle setzt notifications_aktiv", async () => {
      await customerTelegramNotificationsToggle(customerA, false);
      const r1 = await getTestPool()!.query<{ telegram_notifications_aktiv: boolean }>(
        `SELECT telegram_notifications_aktiv FROM sebo.customers WHERE id = $1`,
        [customerA],
      );
      expect(r1.rows[0].telegram_notifications_aktiv).toBe(false);

      await customerTelegramNotificationsToggle(customerA, true);
      const r2 = await getTestPool()!.query<{ telegram_notifications_aktiv: boolean }>(
        `SELECT telegram_notifications_aktiv FROM sebo.customers WHERE id = $1`,
        [customerA],
      );
      expect(r2.rows[0].telegram_notifications_aktiv).toBe(true);
    });
  });
});
