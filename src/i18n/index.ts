/**
 * Leichtgewichtige i18n-Lösung ohne next-intl-Abhängigkeit.
 * Spracherkennung: Cookie `vm_locale` > Browser Accept-Language > Default (ru)
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

/** Server-seitige Locale-Erkennung */
export async function getLocale(): Promise<Locale> {
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

/** Server-side: gibt das Dictionary für die aktuelle Locale zurück */
export async function getDictionary(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale();
  return { locale, t: DICTIONARIES[locale] };
}

/** Synchron für Client-Components (übergeben aus Server-Parent) */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export { LOCALES, LOCALE_INFO, DEFAULT_LOCALE } from "./types";
export type { Locale } from "./types";
