import type { Locale } from "@/i18n/types";

/**
 * Holt den lokalisierten Wert aus einem i18n-JSONB-Feld.
 * Fallback-Reihenfolge: aktive Locale → ru → en → de → erste vorhandene → null.
 *
 * Beispiel: `i18n(produkt.name_i18n, locale) ?? produkt.name`
 */
export function i18n(
  jsonb: Record<string, string> | null | undefined,
  locale: Locale
): string | null {
  if (!jsonb || typeof jsonb !== "object") return null;
  if (jsonb[locale])     return jsonb[locale];
  if (jsonb.ru)          return jsonb.ru;
  if (jsonb.en)          return jsonb.en;
  if (jsonb.de)          return jsonb.de;
  const first = Object.values(jsonb).find(v => typeof v === "string" && v.length > 0);
  return first ?? null;
}

/** Wie i18n() aber mit fallback auf default-string */
export function i18nOr(
  jsonb: Record<string, string> | null | undefined,
  locale: Locale,
  fallback: string | null | undefined
): string {
  return i18n(jsonb, locale) ?? fallback ?? "";
}
