import { randomBytes } from "crypto";
import { query, withTransaction } from "./index";
import type { Customer } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Telegram-Claim — Reverse-Direction Link-Flow.
 *
 * Wenn ein Telegram-User aus der Mini-App heraus einen vorhandenen E-Mail-
 * Account beanspruchen will:
 *  1. claimInitiieren(email, chatId, username) — speichert Token + Wunsch
 *  2. (User bekommt E-Mail mit Magic-Link)
 *  3. claimBestaetigen(token) — kopiert claim-Felder in echte
 *
 * Sicherheits-Modell:
 *  - Verknüpfung wird erst durch Klick auf Magic-Link in E-Mail bestätigt
 *    (Beweis dass User Inbox-Zugang hat)
 *  - 15-Min TTL begrenzt Replay-Risiko
 *  - Wenn Email-Customer schon telegram_chat_id hat → claim wird abgewiesen
 *  - Wenn die chat_id bereits an einen anderen Customer linked ist
 *    → claim wird abgewiesen
 * ────────────────────────────────────────────────────────────────────────── */

const CLAIM_TTL_MS = 15 * 60 * 1000;   // 15 Minuten

export type ClaimInitResult =
  | { ok: true; token: string; emailMasked: string }
  | { ok: false; error: "no-customer" | "already-linked" | "chat-id-busy" | "db-error" };

/**
 * Initiiert einen Claim. Generiert Token, speichert proposed chat_id +
 * username + TTL am Email-Customer. Wenn der schon verknüpft ist oder
 * die Telegram-chat_id bei einem anderen Customer hängt → abgelehnt.
 */
export async function claimInitiieren(
  email:    string,
  chatId:   number,
  username: string | null,
): Promise<ClaimInitResult> {
  const lcEmail = email.trim().toLowerCase();

  try {
    // 1. Customer per E-Mail finden
    const custRes = await query<Customer>(
      `SELECT * FROM sebo.customers WHERE email = $1 LIMIT 1`,
      [lcEmail],
    );
    const customer = custRes.rows[0];
    if (!customer) {
      // Aus Privacy-Gründen wäre „Email existiert nicht" eigentlich Info-Leak.
      // Aber im Mini-App-Kontext (initData verifiziert Telegram-User-ID)
      // ist das akzeptabel — wir geben dem User direktes Feedback.
      return { ok: false, error: "no-customer" };
    }

    // 2. Schon verknüpft mit IRGENDEINEM Telegram?
    if (customer.telegram_chat_id) {
      return { ok: false, error: "already-linked" };
    }

    // 3. Ist diese chat_id bereits an einen ANDEREN Customer gebunden?
    //    Ausnahme: ein E-MAIL-LOSES Telegram-first-Konto (Wegwerf-Konto) — das
    //    wird beim Bestätigen in dieses Konto gemerged (chat_id wandert mit).
    //    Nur ein ECHTES anderes Konto (mit E-Mail) blockiert den Claim.
    const busyRes = await query<{ id: string; email: string | null }>(
      `SELECT id, email FROM sebo.customers
       WHERE telegram_chat_id = $1 AND id <> $2 LIMIT 1`,
      [chatId, customer.id],
    );
    const busy = busyRes.rows[0];
    if (busy && busy.email != null) {
      return { ok: false, error: "chat-id-busy" };
    }

    // 4. Token + Claim-Felder setzen (überschreibt evtl. älteren Claim)
    const token = randomBytes(32).toString("hex").slice(0, 48);
    await query(
      `UPDATE sebo.customers
         SET telegram_claim_token       = $1,
             telegram_claim_chat_id     = $2,
             telegram_claim_username    = $3,
             telegram_claim_expires_at  = now() + interval '15 minutes'
       WHERE id = $4`,
      [token, chatId, username, customer.id],
    );

    return { ok: true, token, emailMasked: maskEmail(customer.email ?? "") };
  } catch (err) {
    console.error("[claimInitiieren]", err);
    return { ok: false, error: "db-error" };
  }
}

export interface ClaimPreview {
  customer_id:     string;
  email:           string;
  vorname:         string | null;
  chat_id:         number;
  username:        string | null;
  expires_at:      string;
}

/**
 * Liest Claim-Daten zum Token. Returns null wenn Token unbekannt oder
 * abgelaufen. Verändert NICHTS (für Preview/Confirm-Page).
 */
export async function claimPruefen(token: string): Promise<ClaimPreview | null> {
  if (!token || token.length < 16) return null;
  const r = await query<{
    id: string; email: string; vorname: string | null;
    telegram_claim_chat_id: number | null;
    telegram_claim_username: string | null;
    telegram_claim_expires_at: string;
  }>(
    `SELECT id, email, vorname,
            telegram_claim_chat_id,
            telegram_claim_username,
            telegram_claim_expires_at
     FROM sebo.customers
     WHERE telegram_claim_token = $1
       AND telegram_claim_expires_at > now()
     LIMIT 1`,
    [token],
  );
  const row = r.rows[0];
  if (!row || !row.telegram_claim_chat_id) return null;
  return {
    customer_id: row.id,
    email:       row.email,
    vorname:     row.vorname,
    chat_id:     row.telegram_claim_chat_id,
    username:    row.telegram_claim_username,
    expires_at:  row.telegram_claim_expires_at,
  };
}

/**
 * Bestätigt den Claim atomar: kopiert claim_chat_id + claim_username
 * in die echten Felder, löscht claim-Felder. Race-safe via WHERE-Bedingung
 * dass Token noch nicht abgelaufen ist.
 *
 * Returns die ID des verknüpften Customers oder null bei Fail.
 */
export async function claimBestaetigen(token: string): Promise<string | null> {
  if (!token || token.length < 16) return null;
  try {
    return await withTransaction(async (client) => {
      // 1. Ziel-Account (per Token, gültig, noch nicht verknüpft) laden.
      const tRes = await client.query<{ id: string; chat_id: number | null; username: string | null }>(
        `SELECT id,
                telegram_claim_chat_id  AS chat_id,
                telegram_claim_username AS username
           FROM sebo.customers
          WHERE telegram_claim_token      = $1
            AND telegram_claim_expires_at > now()
            AND telegram_chat_id IS NULL
          LIMIT 1
          FOR UPDATE`,
        [token],
      );
      const target = tRes.rows[0];
      if (!target || target.chat_id == null) return null;

      // 2. Hält bereits ein anderes Konto diese chat_id?
      const twRes = await client.query<{ id: string; email: string | null }>(
        `SELECT id, email FROM sebo.customers
          WHERE telegram_chat_id = $1 AND id <> $2 LIMIT 1 FOR UPDATE`,
        [target.chat_id, target.id],
      );
      const throwaway = twRes.rows[0];
      if (throwaway) {
        // Echtes anderes Konto (mit E-Mail) → kein stiller Merge, Abbruch.
        if (throwaway.email != null) return null;

        // E-Mail-loses Wegwerf-Konto → chat_id freigeben + Daten umhängen.
        await client.query(
          `UPDATE sebo.customers
              SET telegram_chat_id = NULL, telegram_username = NULL,
                  telegram_notifications_aktiv = false
            WHERE id = $1`,
          [throwaway.id],
        );
        await client.query(`UPDATE sebo.orders SET customer_id = $1 WHERE customer_id = $2`, [target.id, throwaway.id]);
        await client.query(`UPDATE sebo.leads  SET customer_id = $1 WHERE customer_id = $2`, [target.id, throwaway.id]);
      }

      // 3. Ziel-Account verknüpfen + Claim-Felder leeren.
      const up = await client.query<{ id: string }>(
        `UPDATE sebo.customers
            SET telegram_chat_id             = telegram_claim_chat_id,
                telegram_username            = telegram_claim_username,
                telegram_verknuepft_am       = now(),
                telegram_notifications_aktiv = COALESCE(telegram_notifications_aktiv, true),
                telegram_claim_token         = NULL,
                telegram_claim_chat_id       = NULL,
                telegram_claim_username      = NULL,
                telegram_claim_expires_at    = NULL
          WHERE id = $1 AND telegram_chat_id IS NULL
          RETURNING id`,
        [target.id],
      );
      return up.rows[0]?.id ?? null;
    });
  } catch (err) {
    console.error("[claimBestaetigen]", err);
    return null;
  }
}

/** anna@example.com → a***@example.com */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(2, name.length - 1))}@${domain}`;
}

/** Konstante für Auto-Cleanup-Job (kann via cron periodisch laufen). */
export const CLAIM_TTL_SECONDS = CLAIM_TTL_MS / 1000;
