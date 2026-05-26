import { query } from "./index";
import type { Locale } from "@/i18n/types";

/* ──────────────────────────────────────────────────────────────────────────
 * Marketing-Strings — KV-Store mit i18n für editierbare Marketing-Texte.
 *
 * Tabelle: sebo.marketing_strings (siehe sql/023_marketing_strings.sql)
 *   schluessel    string PK (z.B. 'home.hero.h1_unten')
 *   wert_i18n     {ru?: string, en?: string, de?: string, kz?: string}
 *   fallback      string (wenn weder Sprache noch Default-Sprache vorhanden)
 *
 * Cache: 60s in-process Memory. Bei Admin-Update wird Cache invalidiert.
 *
 * Lese-API:
 *   getMarketingString(key, locale)        — einzelner Wert
 *   getMarketingStrings(keys, locale)      — batch
 *   getAllMarketingStrings()               — alle (für Admin-Page)
 *
 * Schreib-API (admin):
 *   upsertMarketingString(key, lang, wert)
 * ────────────────────────────────────────────────────────────────────────── */

export type MarketingI18n = Partial<Record<Locale, string>>;

export interface MarketingString {
  schluessel:      string;
  wert_i18n:       MarketingI18n;
  beschreibung:    string | null;
  fallback:        string;
  aktualisiert_am: string;
}

const CACHE_TTL_MS = 60_000;
let cache: { value: Map<string, MarketingString>; expires: number } | null = null;

function invalidateCache() {
  cache = null;
}

async function loadAll(): Promise<Map<string, MarketingString>> {
  if (cache && cache.expires > Date.now()) return cache.value;
  try {
    const r = await query<MarketingString>(
      `SELECT schluessel, wert_i18n, beschreibung, fallback, aktualisiert_am
       FROM sebo.marketing_strings`
    );
    const map = new Map(r.rows.map(row => [row.schluessel, row]));
    cache = { value: map, expires: Date.now() + CACHE_TTL_MS };
    return map;
  } catch (err) {
    // Bei DB-Ausfall: leere Map, alle Callers fallen auf hardcoded-fallback zurück.
    console.warn("[marketing-strings] DB-Load fehlgeschlagen, nutze Fallbacks:", err);
    return new Map();
  }
}

/** Einen Marketing-String holen mit Sprachen-Fallback ru → en → fallback-Spalte. */
export async function getMarketingString(
  schluessel: string,
  locale: Locale,
  defaultValue: string = "",
): Promise<string> {
  const map = await loadAll();
  const row = map.get(schluessel);
  if (!row) return defaultValue;

  const wert = row.wert_i18n;
  return wert[locale] || wert.ru || wert.en || row.fallback || defaultValue;
}

/** Batch-Lookup — vermeidet n DB-Roundtrips wenn man viele Strings auf einer Seite braucht. */
export async function getMarketingStrings(
  schluessel: string[],
  locale: Locale,
): Promise<Record<string, string>> {
  const map = await loadAll();
  const out: Record<string, string> = {};
  for (const k of schluessel) {
    const row = map.get(k);
    if (row) {
      const wert = row.wert_i18n;
      out[k] = wert[locale] || wert.ru || wert.en || row.fallback || "";
    } else {
      out[k] = "";
    }
  }
  return out;
}

/** Alle Strings laden — für Admin-Edit-Page. */
export async function getAllMarketingStrings(): Promise<MarketingString[]> {
  const map = await loadAll();
  return Array.from(map.values()).sort((a, b) => a.schluessel.localeCompare(b.schluessel));
}

/** Update eines einzelnen Sprach-Werts; legt Eintrag an wenn nicht vorhanden. */
export async function upsertMarketingString(
  schluessel: string,
  patch: MarketingI18n,
): Promise<void> {
  await query(
    `INSERT INTO sebo.marketing_strings (schluessel, wert_i18n, fallback)
     VALUES ($1, $2::jsonb, COALESCE($2::jsonb->>'ru', $2::jsonb->>'en', ''))
     ON CONFLICT (schluessel) DO UPDATE
       SET wert_i18n = sebo.marketing_strings.wert_i18n || EXCLUDED.wert_i18n`,
    [schluessel, JSON.stringify(patch)],
  );
  invalidateCache();
}

/** Cache manuell invalidieren — z.B. nach Bulk-Update. */
export function clearMarketingCache() {
  invalidateCache();
}
