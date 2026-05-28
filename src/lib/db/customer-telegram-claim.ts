import { randomBytes } from "crypto";
import { query } from "./index";
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
    //    (z.B. User hat früher mal mit anderer E-Mail verknüpft)
    const busyRes = await query<{ id: string }>(
      `SELECT id FROM sebo.customers
       WHERE telegram_chat_id = $1 AND id <> $2 LIMIT 1`,
      [chatId, customer.id],
    );
    if (busyRes.rows.length > 0) {
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
    const r = await query<{ id: string }>(
      `UPDATE sebo.customers
         SET telegram_chat_id            = telegram_claim_chat_id,
             telegram_username           = telegram_claim_username,
             telegram_verknuepft_am      = now(),
             telegram_notifications_aktiv = COALESCE(telegram_notifications_aktiv, true),
             telegram_claim_token        = NULL,
             telegram_claim_chat_id      = NULL,
             telegram_claim_username     = NULL,
             telegram_claim_expires_at   = NULL
       WHERE telegram_claim_token       = $1
         AND telegram_claim_expires_at  > now()
         -- Dieser Customer darf noch NICHT verknüpft sein
         AND telegram_chat_id IS NULL
         -- und die beanspruchte chat_id darf nicht inzwischen bei einem
         -- ANDEREN Customer gelandet sein (Race zwischen Claim-Init + Confirm)
         AND NOT EXISTS (
           SELECT 1 FROM sebo.customers c2
           WHERE c2.telegram_chat_id = sebo.customers.telegram_claim_chat_id
             AND c2.id <> sebo.customers.id
         )
       RETURNING id`,
      [token],
    );
    return r.rows[0]?.id ?? null;
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
