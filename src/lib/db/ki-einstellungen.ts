import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * KI-Einstellungen — DeepSeek-API-Key (Assistent + Produkt-KI) zur Laufzeit
 * über das Admin-Menü pflegbar. Gespeichert in sebo.affiliate_einstellungen
 * (key-value). ENV `DEEPSEEK_API_KEY` bleibt als Fallback gültig.
 *
 * Der Roh-Key wird NIE geloggt oder an den Client gesendet — die UI zeigt nur
 * eine maskierte Vorschau. Quelle der Wahrheit zur Laufzeit: DB > ENV.
 * ────────────────────────────────────────────────────────────────────────── */

const KEY_SCHLUESSEL = "deepseek_api_key";

// Kurzer In-Process-Cache, damit nicht jeder KI-Call die DB trifft.
let _cache: { key: string | null; expires: number } | null = null;
const CACHE_TTL_MS = 30_000;

export function clearKiKeyCache(): void {
  _cache = null;
}

/** Roh-Key für den DeepSeek-Client: DB-Wert, sonst ENV. null wenn nichts gesetzt. */
export async function getKiApiKey(): Promise<string | null> {
  if (_cache && _cache.expires > Date.now()) return _cache.key;

  let dbKey: string | null = null;
  try {
    const r = await query<{ wert: string }>(
      `SELECT wert FROM sebo.affiliate_einstellungen WHERE schluessel = $1`,
      [KEY_SCHLUESSEL],
    );
    dbKey = r.rows[0]?.wert?.trim() || null;
  } catch {
    /* DB-Fehler → ENV-Fallback */
  }

  const key = dbKey || process.env.DEEPSEEK_API_KEY?.trim() || null;
  _cache = { key, expires: Date.now() + CACHE_TTL_MS };
  return key;
}

/** Maskierte Vorschau für die Admin-UI (nie der Roh-Key). */
function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 11) return "••••";
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

export interface KiKeyStatus {
  gesetzt:   boolean;
  quelle:    "db" | "env" | "keine";
  maskiert:  string | null;
}

/** Status für die Admin-Anzeige (ob/woher ein Key kommt, maskiert). */
export async function getKiKeyStatus(): Promise<KiKeyStatus> {
  let dbKey: string | null = null;
  try {
    const r = await query<{ wert: string }>(
      `SELECT wert FROM sebo.affiliate_einstellungen WHERE schluessel = $1`,
      [KEY_SCHLUESSEL],
    );
    dbKey = r.rows[0]?.wert?.trim() || null;
  } catch {
    /* ignore */
  }
  if (dbKey) return { gesetzt: true, quelle: "db", maskiert: maskKey(dbKey) };

  const envKey = process.env.DEEPSEEK_API_KEY?.trim() || null;
  if (envKey) return { gesetzt: true, quelle: "env", maskiert: maskKey(envKey) };

  return { gesetzt: false, quelle: "keine", maskiert: null };
}

/**
 * API-Key setzen (UPSERT) oder löschen (leerer Wert → Zeile entfernen, fällt
 * auf ENV zurück). Invalidiert den Cache. Best-effort Audit-Trail.
 */
export async function setKiApiKey(key: string | null, adminEmail?: string): Promise<void> {
  const clean = (key ?? "").trim();

  if (clean.length === 0) {
    await query(`DELETE FROM sebo.affiliate_einstellungen WHERE schluessel = $1`, [KEY_SCHLUESSEL]);
  } else {
    await query(
      `INSERT INTO sebo.affiliate_einstellungen (schluessel, wert, beschreibung)
       VALUES ($1, $2, 'DeepSeek API-Key (Ассистент + ИИ товаров) — gepflegt im Admin')
       ON CONFLICT (schluessel) DO UPDATE
         SET wert = EXCLUDED.wert, aktualisiert_am = now()`,
      [KEY_SCHLUESSEL, clean],
    );
  }
  clearKiKeyCache();

  try {
    const { auditLog } = await import("./audit-log");
    await auditLog({
      action:     clean.length === 0 ? "ki_key_geloescht" : "ki_key_gesetzt",
      actorEmail: adminEmail ?? null,
      entity:     KEY_SCHLUESSEL,
      // Key-Wert NICHT loggen — nur die Tatsache der Änderung.
      neuWert:    { gesetzt: clean.length > 0 },
    });
  } catch {
    /* Audit best-effort */
  }
}
