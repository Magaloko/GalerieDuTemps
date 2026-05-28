import { randomBytes } from "crypto";
import { query } from "./index";
import type { Customer } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Customer-Telegram-Verknüpfung
 *
 * Drei Operationen:
 *  1. token generieren (vom Customer-Profile-Click)
 *  2. token einlösen (vom Webhook beim /start-Command)
 *  3. lookup per chat_id (von Notifications-Lib zum Versenden)
 *  4. Verknüpfung lösen (Customer klickt „Entfernen")
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Generiert ein 32-Byte-Token (64 hex chars), speichert es als pending-
 * link-token am Customer und returned das Token. Falls schon ein Token
 * existiert (z.B. User hat „Verknüpfen" doppelt geklickt), wird das
 * existierende zurückgegeben — kein Re-Generate.
 */
export async function customerTelegramTokenGenerieren(
  customerId: string,
): Promise<string> {
  // Existierendes Token nicht überschreiben (verhindert Race wenn User
  // den Link gerade im Telegram nutzt).
  const existing = await query<{ telegram_link_token: string | null }>(
    `SELECT telegram_link_token FROM sebo.customers WHERE id = $1`,
    [customerId],
  );
  const cur = existing.rows[0]?.telegram_link_token;
  if (cur) return cur;

  const token = randomBytes(32).toString("hex").slice(0, 48);
  await query(
    `UPDATE sebo.customers SET telegram_link_token = $1 WHERE id = $2`,
    [token, customerId],
  );
  return token;
}

/**
 * Löst ein Token ein: setzt chat_id + username, löscht Token, gibt
 * Customer zurück. Returned null wenn Token unbekannt/bereits verbraucht.
 */
export async function customerTelegramVerknuepfen(
  token: string,
  chatId: number,
  username: string | null,
): Promise<Customer | null> {
  // Race-safe: UPDATE in einem Statement, RETURNING liefert nur wenn Match.
  // Falls bereits ein anderer Customer dieselbe chat_id hat (z.B. zweiter
  // Account selber Telegram-User), würde der unique-index-violation werfen —
  // in dem Fall geben wir null zurück und der User sieht eine Fehlermeldung.
  try {
    const r = await query<Customer>(
      `UPDATE sebo.customers
         SET telegram_chat_id        = $1,
             telegram_username       = $2,
             telegram_link_token     = NULL,
             telegram_verknuepft_am  = now()
       WHERE telegram_link_token     = $3
       RETURNING *`,
      [chatId, username, token],
    );
    return r.rows[0] ?? null;
  } catch (err) {
    console.warn("[customerTelegramVerknuepfen]", err);
    return null;
  }
}

/** Reverse-Lookup für eingehende Bot-Messages: chat_id → Customer */
export async function customerByTelegramChatId(
  chatId: number,
): Promise<Customer | null> {
  const r = await query<Customer>(
    `SELECT * FROM sebo.customers
     WHERE telegram_chat_id = $1 LIMIT 1`,
    [chatId],
  );
  return r.rows[0] ?? null;
}

/**
 * Legt ein Telegram-first-Konto an (Identität = telegram_chat_id, KEINE E-Mail).
 * Idempotent: existiert bereits ein Konto mit dieser chat_id, wird es 1:1
 * zurückgegeben (kein Duplikat). Voraussetzung: Migration 050 (email nullable).
 *
 * agb_akzeptiert_am wird gesetzt — der 1-Tap-„Profil anlegen" ist die Zustimmung.
 */
export async function customerAusTelegramErstellen(input: {
  chatId:   number;
  username: string | null;
  vorname:  string | null;
}): Promise<Customer> {
  const bestehend = await customerByTelegramChatId(input.chatId);
  if (bestehend) return bestehend;

  const r = await query<Customer>(
    `INSERT INTO sebo.customers
       (email, passwort_hash, vorname, customer_type,
        telegram_chat_id, telegram_username, telegram_verknuepft_am,
        telegram_notifications_aktiv, agb_akzeptiert_am)
     VALUES (NULL, NULL, $1, 'b2c', $2, $3, now(), true, now())
     RETURNING *`,
    [input.vorname, input.chatId, input.username],
  );
  return r.rows[0];
}

/** Verknüpfung lösen (Customer im Profile oder Admin) */
export async function customerTelegramLoesen(customerId: string): Promise<void> {
  await query(
    `UPDATE sebo.customers
       SET telegram_chat_id        = NULL,
           telegram_username       = NULL,
           telegram_link_token     = NULL,
           telegram_verknuepft_am  = NULL
     WHERE id = $1`,
    [customerId],
  );
}

/** Notifications-Toggle setzen (Master-Switch) */
export async function customerTelegramNotificationsToggle(
  customerId: string,
  aktiv: boolean,
): Promise<void> {
  await query(
    `UPDATE sebo.customers
       SET telegram_notifications_aktiv = $1
     WHERE id = $2`,
    [aktiv, customerId],
  );
}

/**
 * Liest den Bot-Username aus sebo.kanal_konten für den /start-Deep-Link.
 * Returns null wenn noch kein Bot konfiguriert.
 */
export async function brandBotUsername(): Promise<string | null> {
  const r = await query<{ username: string | null }>(
    `SELECT username FROM sebo.kanal_konten
     WHERE kanal = 'telegram' AND aktiv = true
     ORDER BY id DESC LIMIT 1`,
  );
  return r.rows[0]?.username ?? null;
}
