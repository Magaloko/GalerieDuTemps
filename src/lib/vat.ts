/**
 * Single-Source für USt./MwSt./НДС-Berechnung
 *
 * Regeln:
 * - tax_exempt → 0 % (z.B. Bildungsleistungen)
 * - Reverse-Charge (EU B2B mit UID + Lieferland ≠ inland) → 0 %
 * - sonst Landessatz: KZ 12% (НДС), AT 20%, DE 19%
 *
 * Wichtig: Mixed Carts (z.B. Seminar + Ware) bekommen unterschiedliche Sätze pro Item.
 */

const STANDARD_SAETZE: Record<string, number> = {
  // Kasachstan (NEU — Default für vintage-market)
  KZ: 12,
  // Russland
  RU: 20,
  // Zentralasien
  UZ: 12,        // Usbekistan
  KG: 12,        // Kirgistan
  TJ: 18,        // Tadschikistan
  TM: 15,        // Turkmenistan
  // EU
  DE: 19,
  AT: 20,
  FR: 20,
  IT: 22,
  NL: 21,
  BE: 21,
  ES: 21,
  PL: 23,
  // Drittländer mit eigener Logik
  CH: 0,
  US: 0,
  GB: 20,
};

const DEFAULT_SATZ = parseFloat(process.env.NEXT_PUBLIC_VAT_DEFAULT ?? "12");

export interface SteuerKontext {
  tax_exempt:     boolean;
  liefer_land:    string;          // ISO Code des Lieferlandes
  reverse_charge: boolean;          // EU B2B mit UID + nicht-inland
}

/**
 * Berechnet den Steuersatz für eine einzelne Position
 * @returns Steuersatz in Prozent (0, 12, 19, 20, ...)
 */
export function getItemTaxRate(ctx: SteuerKontext): number {
  if (ctx.tax_exempt)     return 0;
  if (ctx.reverse_charge) return 0;
  return STANDARD_SAETZE[ctx.liefer_land?.toUpperCase()] ?? DEFAULT_SATZ;
}

/**
 * Berechnet USt-Betrag aus Brutto-Preis und Steuersatz
 */
export function taxFromGross(brutto_cents: number, rate: number): number {
  if (rate === 0) return 0;
  return Math.round(brutto_cents * rate / (100 + rate));
}

/**
 * Berechnet Brutto aus Netto + Steuersatz
 */
export function grossFromNet(netto_cents: number, rate: number): number {
  return Math.round(netto_cents * (100 + rate) / 100);
}

/**
 * Prüft ob Reverse-Charge anwendbar ist (NUR für EU B2B!)
 * In Kasachstan gibt es kein EU-Reverse-Charge-System.
 */
export function istReverseCharge(opts: {
  customer_type: string;
  ust_id?:       string | null;
  liefer_land:   string;
  eigen_land?:   string;
}): boolean {
  const eigen = (opts.eigen_land ?? process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? "KZ").toUpperCase();
  // Reverse-Charge ist ein EU-Konstrukt — gilt nur, wenn das eigene Land in der EU ist
  const EU_LAENDER = ["DE","AT","FR","IT","NL","BE","ES","PL"];
  if (!EU_LAENDER.includes(eigen)) return false;

  return (
    opts.customer_type === "b2b_verified" &&
    !!opts.ust_id &&
    opts.ust_id.length >= 4 &&
    opts.liefer_land.toUpperCase() !== eigen &&
    EU_LAENDER.includes(opts.liefer_land.toUpperCase())
  );
}
