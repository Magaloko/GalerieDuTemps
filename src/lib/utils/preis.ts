/** Multi-Currency Preis-Formatierung
 *
 *  KZT: ₸ 1 250    (kasachischer Standard, keine Nachkommastellen)
 *  EUR: 1.250,00 €
 *  USD: $1,250.00
 *  RUB: 1 250,00 ₽
 */

export type Currency = "KZT" | "EUR" | "USD" | "RUB";

const LOCALE_MAP: Record<Currency, string> = {
  KZT: "ru-KZ",
  EUR: "de-DE",
  USD: "en-US",
  RUB: "ru-RU",
};

const DEFAULT_CURRENCY = (process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "KZT") as Currency;

/** Formatiert einen Preis mit Währung.
 *  kompakt=true: Nachkommastellen weglassen wenn .00 (für Karten/Chips) */
export function formatPreis(
  preis: number | string | null | undefined,
  waehrung: Currency = DEFAULT_CURRENCY,
  kompakt = false,
): string {
  const num = typeof preis === "string" ? parseFloat(preis) : (preis ?? 0);
  if (isNaN(num)) return "–";

  // KZT: keine Nachkommastellen üblich (₸ ist große Einheit)
  const isRound      = num % 1 === 0;
  const minFrac = (waehrung === "KZT" || (kompakt && isRound)) ? 0 : 2;
  const maxFrac = waehrung === "KZT" ? 0 : 2;

  return num.toLocaleString(LOCALE_MAP[waehrung] ?? "ru-KZ", {
    style:                 "currency",
    currency:              waehrung,
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });
}

/** Berechnet Rabatt in Prozent */
export function rabattProzent(preis: number, originalpreis: number): number {
  if (!originalpreis || originalpreis <= preis) return 0;
  return Math.round(((originalpreis - preis) / originalpreis) * 100);
}

/** Formatiert eine Zahl ohne Währung (z.B. für Statistiken) */
export function formatZahl(zahl: number | null | undefined, dezimalstellen = 0): string {
  if (zahl === null || zahl === undefined || isNaN(zahl)) return "–";
  return zahl.toLocaleString("ru-KZ", {
    minimumFractionDigits: dezimalstellen,
    maximumFractionDigits: dezimalstellen,
  });
}
