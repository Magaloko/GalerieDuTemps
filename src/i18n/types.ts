export type Locale = "ru" | "kz" | "en" | "de";

export const LOCALES: Locale[] = ["ru", "kz", "en", "de"];
export const DEFAULT_LOCALE: Locale = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE ?? "ru") as Locale;

export interface LocaleInfo {
  code:     Locale;
  name:     string;
  flag:     string;          // Emoji
  dir:      "ltr" | "rtl";
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  ru: { code: "ru", name: "Русский",   flag: "🇷🇺", dir: "ltr" },
  kz: { code: "kz", name: "Қазақша",   flag: "🇰🇿", dir: "ltr" },
  en: { code: "en", name: "English",   flag: "🇬🇧", dir: "ltr" },
  de: { code: "de", name: "Deutsch",   flag: "🇩🇪", dir: "ltr" },
};
