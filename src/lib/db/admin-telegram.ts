import { randomBytes } from "crypto";
import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Telegram-Verknüpfung (analog customer-telegram.ts für sebo.benutzer)
 *
 * Drei Operationen:
 *  1. tokenGenerieren — Admin-Profil-Click „Подключить"
 *  2. tokenEinloesen — Webhook beim /start <token> Command
 *  3. Verknüpfung lösen — Admin klickt „Отвязать"
 *
 * Schema-Voraussetzung: Migration 037_admin_telegram.sql angewendet.
 * ────────────────────────────────────────────────────────────────────────── */

export interface BenutzerRow {
  id: string;
  email: string;
  name: string | null;
  rolle: string;
  telegram_chat_id:  number | null;
  telegram_username: string | null;
  telegram_verknuepft_am: string | null;
  telegram_link_token: string | null;
}

/** Idempotent: gibt existierenden Token zurück wenn vorhanden. */
export async function adminTelegramTokenGenerieren(benutzerId: string): Promise<string> {
  const existing = await query<{ telegram_link_token: string | null }>(
    `SELECT telegram_link_token FROM sebo.benutzer WHERE id = $1`,
    [benutzerId],
  );
  const cur = existing.rows[0]?.telegram_link_token;
  if (cur) return cur;

  const token = randomBytes(32).toString("hex").slice(0, 48);
  await query(
    `UPDATE sebo.benutzer SET telegram_link_token = $1 WHERE id = $2`,
    [token, benutzerId],
  );
  return token;
}

/** Race-safe: UPDATE+RETURNING. Returns benutzer-Row oder null wenn Token unbekannt. */
export async function adminTelegramVerknuepfen(
  token: string,
  chatId: number,
  username: string | null,
): Promise<BenutzerRow | null> {
  try {
    const r = await query<BenutzerRow>(
      `UPDATE sebo.benutzer
         SET telegram_chat_id        = $1,
             telegram_username       = $2,
             telegram_link_token     = NULL,
             telegram_verknuepft_am  = now()
       WHERE telegram_link_token     = $3
         AND aktiv = true
         AND rolle IN ('admin','superadmin')
       RETURNING id, email, name, rolle,
                 telegram_chat_id, telegram_username,
                 telegram_verknuepft_am, telegram_link_token`,
      [chatId, username, token],
    );
    return r.rows[0] ?? null;
  } catch (err) {
    console.warn("[adminTelegramVerknuepfen]", err);
    return null;
  }
}

export async function adminTelegramLoesen(benutzerId: string): Promise<void> {
  await query(
    `UPDATE sebo.benutzer
       SET telegram_chat_id        = NULL,
           telegram_username       = NULL,
           telegram_verknuepft_am  = NULL,
           telegram_link_token     = NULL
     WHERE id = $1`,
    [benutzerId],
  );
}

export async function adminGetTelegramStatus(benutzerId: string): Promise<{
  chat_id:       number | null;
  username:      string | null;
  verknuepft_am: string | null;
}> {
  const r = await query<{
    telegram_chat_id:       number | null;
    telegram_username:      string | null;
    telegram_verknuepft_am: string | null;
  }>(
    `SELECT telegram_chat_id, telegram_username, telegram_verknuepft_am
     FROM sebo.benutzer WHERE id = $1`,
    [benutzerId],
  );
  const row = r.rows[0];
  return {
    chat_id:       row?.telegram_chat_id      ?? null,
    username:      row?.telegram_username     ?? null,
    verknuepft_am: row?.telegram_verknuepft_am ?? null,
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Profil im Mini-App (Notifications + Kontaktdaten).
 * Voraussetzung: Migration 049 (telefon/whatsapp/kontakt_kanal auf benutzer).
 * ────────────────────────────────────────────────────────────────────────── */

export interface AdminProfil {
  name:                  string | null;
  email:                 string;
  rolle:                 string;
  telegram_chat_id:      number | null;
  telegram_username:     string | null;
  telegram_verknuepft_am: string | null;
  notifications_aktiv:   boolean;
  telefon:               string | null;
  whatsapp:              string | null;
  kontakt_kanal:         string | null;
}

export async function adminProfilLaden(benutzerId: string): Promise<AdminProfil | null> {
  const r = await query<AdminProfil>(
    `SELECT name, email, rolle,
            telegram_chat_id, telegram_username, telegram_verknuepft_am,
            COALESCE(telegram_notifications_aktiv, true) AS notifications_aktiv,
            telefon, whatsapp, kontakt_kanal
       FROM sebo.benutzer WHERE id = $1`,
    [benutzerId],
  );
  return r.rows[0] ?? null;
}

export async function adminTelegramNotificationsSetzen(benutzerId: string, aktiv: boolean): Promise<void> {
  await query(
    `UPDATE sebo.benutzer SET telegram_notifications_aktiv = $1 WHERE id = $2`,
    [aktiv, benutzerId],
  );
}

export async function adminProfilKontaktAktualisieren(
  benutzerId: string,
  data: { telefon?: string | null; whatsapp?: string | null; kontakt_kanal?: string | null },
): Promise<void> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;
  for (const key of ["telefon", "whatsapp", "kontakt_kanal"] as const) {
    if (data[key] !== undefined) { felder.push(`${key} = $${idx++}`); werte.push(data[key]); }
  }
  if (felder.length === 0) return;
  werte.push(benutzerId);
  await query(`UPDATE sebo.benutzer SET ${felder.join(", ")} WHERE id = $${idx}`, werte);
}
