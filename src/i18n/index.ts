/**
 * Leichtgewichtige i18n-Lösung ohne next-intl-Abhängigkeit.
 *
 * AKTUELLES VERHALTEN (Option A — static-friendly):
 * Server-side wird IMMER die Default-Locale (`NEXT_PUBLIC_DEFAULT_LANGUAGE`,
 * default: "ru") gerendert. Kein cookies()/headers()-Aufruf in `getLocale()`
 * → Public-Pages können statisch generiert + ISR-gecacht werden.
 *
 * Der LanguageSwitcher (Client-Component) setzt zwar weiterhin den Cookie
 * `vm_locale`, aber das wirkt nur auf Client-Side-Logic (z.B. Date-Format-
 * Locale, falls genutzt) — NICHT mehr auf den Server-rendered Content.
 *
 * Für echte Multi-Locale-Inhalte: Migration auf URL-basierte Locales
 * (/ru/, /en/, /kz/) — siehe ROADMAP, Option B.
 *
 * Falls eine Route ECHTES cookie-aware Locale braucht (z.B. Header-Switcher
 * der die aktive Sprache markieren soll): nutze `getRequestLocale()` —
 * markiert die Route als dynamic, dafür liest sie Cookie + Accept-Language.
 */

import { cookies, headers } from "next/headers";
import { ru } from "./messages/ru";
import { kz } from "./messages/kz";
import { en } from "./messages/en";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./types";

export type Dictionary = typeof ru;

// Cast notwendig, weil `as const` in den Message-Dateien literal types erzeugt
const DICTIONARIES: Record<Locale, Dictionary> = {
  ru,
  kz: kz as unknown as Dictionary,
  en: en as unknown as Dictionary,
  de: ru,   // DE-Fallback auf RU (Admin spricht meist beides)
};

/**
 * Static-friendly: gibt immer DEFAULT_LOCALE zurück — KEIN cookies()-Read.
 * Pages bleiben dadurch statisch generierbar.
 *
 * Brauchst du cookie-aware Locale → `getRequestLocale()`.
 */
export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}

/**
 * Dynamic-Variante: liest Cookie + Accept-Language wie früher getLocale().
 * VERWENDUNG NUR in Routes die ohnehin dynamic sein müssen
 * (z.B. Server-Actions, Admin-Pages, API-Routes).
 *
 * Macht alle aufrufenden Components dynamic.
 */
export async function getRequestLocale(): Promise<Locale> {
  const c = await cookies();
  const cookieLocale = c.get("vm_locale")?.value as Locale | undefined;
  if (cookieLocale && LOCALES.includes(cookieLocale)) return cookieLocale;

  const h = await headers();
  const acceptLang = h.get("accept-language") ?? "";
  for (const l of LOCALES) {
    if (acceptLang.toLowerCase().includes(l)) return l;
  }
  return DEFAULT_LOCALE;
}

/**
 * Server-side: gibt das Dictionary für die Default-Locale zurück.
 * Static-friendly (KEIN dynamic-opt-in).
 */
export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] };
}

/**
 * Dynamic-Variante: cookie-aware Dictionary für Pages die das brauchen.
 * Macht die Route dynamic.
 */
export async function getRequestDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getRequestLocale();
  return { locale, t: DICTIONARIES[locale] };
}

/** Synchron für Client-Components (übergeben aus Server-Parent) */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export { LOCALES, LOCALE_INFO, DEFAULT_LOCALE } from "./types";
export type { Locale } from "./types";
