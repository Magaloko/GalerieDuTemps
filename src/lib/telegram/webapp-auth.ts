import { createHmac } from "crypto";
import { query } from "@/lib/db";
import {
  customerByTelegramChatId,
} from "@/lib/db/customer-telegram";
import type { Customer } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Telegram Mini App — initData-Verifikation
 *
 * Wenn ein User die Mini App im Telegram-Client öffnet, hängt Telegram an
 * den URL-Hash bzw. liefert via window.Telegram.WebApp.initData einen
 * signierten Query-String:
 *
 *   user=%7B%22id%22%3A123...%7D&auth_date=1234567890&hash=abc...
 *
 * Der Server MUSS den hash gegen alle anderen Felder verifizieren, sonst
 * kann jeder eine beliebige user.id einschmuggeln.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Schritte:
 *  1. Parse initData als URLSearchParams
 *  2. Extrahiere hash
 *  3. Build data_check_string = alle anderen key=value sortiert, joined mit \n
 *  4. secret_key = HMAC_SHA256("WebAppData", bot_token)
 *  5. expected_hash = HMAC_SHA256_HEX(secret_key, data_check_string)
 *  6. compare expected_hash === hash (constant-time)
 *
 * Zusätzlich: auth_date Alter prüfen (Default-Toleranz 24h).
 * ────────────────────────────────────────────────────────────────────────── */

export interface TelegramWebAppUser {
  id:              number;
  first_name:      string;
  last_name?:      string;
  username?:       string;
  language_code?:  string;
  is_premium?:     boolean;
  photo_url?:      string;
}

export interface ValidatedInitData {
  user:        TelegramWebAppUser;
  auth_date:   number;
  query_id?:   string;
  start_param?: string;
}

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Validiert ein initData-Query-String und gibt die geparste user.id zurück
 * (oder null bei ungültiger Signatur / abgelaufenem Token).
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE_SECONDS,
): ValidatedInitData | null {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash   = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  // data_check_string: alle KV sortiert nach Key, Format key=value, joined mit \n
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey   = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed    = createHmac("sha256", secretKey).update(sorted).digest("hex");

  if (!constantTimeEqual(computed, hash)) return null;

  // Auth-Date validieren
  const authDate = parseInt(params.get("auth_date") ?? "0", 10);
  if (!authDate) return null;
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -60) return null;

  // User-JSON parsen
  const userRaw = params.get("user");
  if (!userRaw) return null;
  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }
  if (!user.id || typeof user.id !== "number") return null;

  return {
    user,
    auth_date:   authDate,
    query_id:    params.get("query_id") ?? undefined,
    start_param: params.get("start_param") ?? undefined,
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Lädt den aktuellen Brand-Bot-Token (für initData-Verifikation).
 * Returns null wenn kein Bot aktiv konfiguriert.
 */
export async function loadBotTokenForAuth(): Promise<string | null> {
  const r = await query<{ access_token: string | null }>(
    `SELECT access_token FROM sebo.kanal_konten
     WHERE kanal = 'telegram' AND aktiv = true
     ORDER BY id DESC LIMIT 1`,
  );
  return r.rows[0]?.access_token ?? null;
}

/**
 * Findet einen Customer für eine Telegram-User-ID — OHNE auto-create.
 *
 * Vorher legte diese Funktion bei jedem Mini-App-Öffnen einen Pseudo-
 * Customer mit `tg<id>@telegram.local` an. Das führte zu Duplikat-
 * Accounts wenn der gleiche User auch ein normales Konto per E-Mail
 * registrieren wollte — Bestellungen waren auf zwei Customers verteilt
 * und nicht zusammenführbar ohne manuellen Admin-Eingriff.
 *
 * Neue Architektur:
 *  - Mini-App läuft ANONYM solange der User nicht aktiv verknüpft
 *  - Verknüpfung passiert ausschließlich über den OTP-Flow:
 *    1. User registriert/loggt sich auf der Website ein
 *    2. /kunde/profil → „Подключить Telegram" → OTP-Token
 *    3. Bot: /start <token> → customerTelegramVerknuepfen
 *  - Resultat: 1 Customer pro Person, eindeutig identifiziert per E-Mail,
 *    optional verknüpft mit Telegram
 *
 * Auswirkungen aufs UI:
 *  - /tg/orders zeigt CTA „Привязать аккаунт" wenn customer === null
 *  - /tg/profil zeigt analog CTA
 *  - /tg/cart funktioniert weiter (localStorage, /api/cart gibt 401 zurück)
 *  - Checkout im Mini-App: kann anonym sein (orderErstellen akzeptiert
 *    customer_id=null mit gast@... E-Mail), oder verlangt Verknüpfung —
 *    aktuell zweites, weil unverknüpfter User keine Order-Historie sehen
 *    kann
 */
export async function findCustomerForTelegramUser(
  tgUser: TelegramWebAppUser,
): Promise<Customer | null> {
  return customerByTelegramChatId(tgUser.id);
}

/**
 * @deprecated benutze findCustomerForTelegramUser — alte Auto-Create-Logik
 * verursacht Duplikat-Customers. Beibehalten nur für Backwards-Compat;
 * jede Verwendung sollte überprüft werden.
 */
export async function findOrCreateCustomerForTelegramUser(
  tgUser: TelegramWebAppUser,
): Promise<Customer | null> {
  return findCustomerForTelegramUser(tgUser);
}
