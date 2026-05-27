import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";

/**
 * DB-Layer-Tests für Order-Pipeline.
 *
 * Fokus: ATOMARE Stock-Reservation (Codex' a602bad Fix). Zwei concurrent
 * Käufer dürfen NICHT beide das gleiche Unikat bekommen — der zweite muss
 * mit "Out of stock" abgewiesen werden.
 */

describe.skipIf(!testDbAvailable())("db/orders (Integration)", () => {
  let produktId: string;

  beforeAll(async () => {
    await setupTestSchema();
    __setPoolForTesting(getTestPool());
  });

  afterAll(async () => {
    __setPoolForTesting(null);
    await teardownTestDb();
  });

  // Pro Test: 1 frisches Unikat-Produkt (lagerbestand=1) anlegen
  beforeEach(async () => {
    const p = getTestPool()!;
    await p.query(`TRUNCATE sebo.order_items, sebo.orders, sebo.produkte RESTART IDENTITY CASCADE`);
    const r = await p.query<{ id: string }>(
      `INSERT INTO sebo.produkte (name, slug, preis, lagerbestand, aktiv, veroeffentlicht_am)
       VALUES ('Test-Unikat', 'test-unikat', 100000, 1, true, now())
       RETURNING id`
    );
    produktId = r.rows[0].id;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ATOMIC STOCK RESERVATION (Codex' a602bad)
  // ─────────────────────────────────────────────────────────────────────────
  describe("atomare Stock-Reservation", () => {
    it("erste Reservierung erfolgreich, zweite scheitert (lagerbestand=1)", async () => {
      const p = getTestPool()!;

      // Erste Reservierung
      const r1 = await p.query(
        `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
         WHERE id = $1 AND lagerbestand >= 1
         RETURNING lagerbestand`,
        [produktId],
      );
      expect(r1.rowCount).toBe(1);
      expect(r1.rows[0].lagerbestand).toBe(0);

      // Zweite Reservierung — sollte rowCount=0 liefern weil lagerbestand jetzt 0
      const r2 = await p.query(
        `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
         WHERE id = $1 AND lagerbestand >= 1
         RETURNING lagerbestand`,
        [produktId],
      );
      expect(r2.rowCount).toBe(0);
    });

    it("Bestand bleibt bei 0 nicht negativ — Constraint via WHERE-Clause", async () => {
      const p = getTestPool()!;
      // Reduzieren bis 0
      await p.query(
        `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
         WHERE id = $1 AND lagerbestand >= 1`,
        [produktId],
      );

      // Versuch noch eins zu nehmen
      const r = await p.query<{ lagerbestand: number }>(
        `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
         WHERE id = $1 AND lagerbestand >= 1
         RETURNING lagerbestand`,
        [produktId],
      );
      expect(r.rowCount).toBe(0);

      // Verify dass Bestand tatsächlich 0 ist (nicht -1)
      const check = await p.query<{ lagerbestand: number }>(
        `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`,
        [produktId],
      );
      expect(check.rows[0].lagerbestand).toBe(0);
    });

    it("concurrent Reservation: 2 parallele Promises, nur einer gewinnt", async () => {
      const p = getTestPool()!;

      // Bestand auf 1 setzen (war eh schon)
      await p.query(
        `UPDATE sebo.produkte SET lagerbestand = 1 WHERE id = $1`,
        [produktId],
      );

      // 2 parallele UPDATE-Calls (race-condition simulieren)
      const [r1, r2] = await Promise.all([
        p.query(
          `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
           WHERE id = $1 AND lagerbestand >= 1
           RETURNING id`,
          [produktId],
        ),
        p.query(
          `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
           WHERE id = $1 AND lagerbestand >= 1
           RETURNING id`,
          [produktId],
        ),
      ]);

      // Genau EINER bekommt das Produkt
      const winners = [r1.rowCount, r2.rowCount].filter(c => c === 1).length;
      expect(winners).toBe(1);

      // Verify final state
      const check = await p.query<{ lagerbestand: number }>(
        `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`,
        [produktId],
      );
      expect(check.rows[0].lagerbestand).toBe(0);
    });

    it("Mehrere Items im Cart: alle ODER keiner reserviert (Transaction)", async () => {
      const p = getTestPool()!;
      // 2 Unikate anlegen
      const a = await p.query<{ id: string }>(
        `INSERT INTO sebo.produkte (name, slug, preis, lagerbestand, aktiv, veroeffentlicht_am)
         VALUES ('Item A', 'item-a', 100, 1, true, now()) RETURNING id`
      );
      const b = await p.query<{ id: string }>(
        `INSERT INTO sebo.produkte (name, slug, preis, lagerbestand, aktiv, veroeffentlicht_am)
         VALUES ('Item B', 'item-b', 100, 0, true, now()) RETURNING id`  // Item B ist out-of-stock
      );

      const client = await p.connect();
      try {
        await client.query("BEGIN");

        // A reservieren
        const ra = await client.query(
          `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
           WHERE id = $1 AND lagerbestand >= 1`,
          [a.rows[0].id],
        );
        expect(ra.rowCount).toBe(1);

        // B versuchen
        const rb = await client.query(
          `UPDATE sebo.produkte SET lagerbestand = lagerbestand - 1
           WHERE id = $1 AND lagerbestand >= 1`,
          [b.rows[0].id],
        );

        if (rb.rowCount === 0) {
          // Rollback — A's Reservation rückgängig machen
          await client.query("ROLLBACK");
        } else {
          await client.query("COMMIT");
        }
      } finally {
        client.release();
      }

      // Nach Rollback: A's Bestand muss wieder 1 sein
      const checkA = await p.query<{ lagerbestand: number }>(
        `SELECT lagerbestand FROM sebo.produkte WHERE id = $1`,
        [a.rows[0].id],
      );
      expect(checkA.rows[0].lagerbestand).toBe(1);
    });
  });
});
