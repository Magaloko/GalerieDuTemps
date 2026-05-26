import { query } from "./index";

export type Waehrung = "KZT" | "EUR" | "USD" | "RUB";
export const WAEHRUNGEN: Waehrung[] = ["KZT", "EUR", "USD", "RUB"];

export interface Wechselkurs {
  waehrung:        Waehrung;
  name:            string;
  symbol:          string;
  rate_to_kzt:     number;       // 1 waehrung = rate_to_kzt KZT
  quelle:          string | null;
  aktualisiert_am: string;
}

/**
 * Lädt alle aktuellen Wechselkurse aus der DB.
 * Fallback (z.B. wenn Migration noch nicht durch): fix-codiert für die
 * Standard-4 Währungen. So crasht das UI nie.
 */
export async function alleWechselkurse(): Promise<Wechselkurs[]> {
  try {
    const r = await query<Wechselkurs>(
      `SELECT waehrung, name, symbol, rate_to_kzt::float AS rate_to_kzt,
              quelle, aktualisiert_am
       FROM sebo.wechselkurse
       ORDER BY CASE waehrung WHEN 'KZT' THEN 0 ELSE 1 END, waehrung`
    );
    if (r.rows.length > 0) return r.rows;
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK_KURSE;
}

const FALLBACK_KURSE: Wechselkurs[] = [
  { waehrung: "KZT", name: "Тенге",            symbol: "₸", rate_to_kzt: 1,   quelle: "fallback", aktualisiert_am: new Date().toISOString() },
  { waehrung: "EUR", name: "Евро",              symbol: "€", rate_to_kzt: 540, quelle: "fallback", aktualisiert_am: new Date().toISOString() },
  { waehrung: "USD", name: "Доллар США",        symbol: "$", rate_to_kzt: 500, quelle: "fallback", aktualisiert_am: new Date().toISOString() },
  { waehrung: "RUB", name: "Российский рубль", symbol: "₽", rate_to_kzt: 5.5, quelle: "fallback", aktualisiert_am: new Date().toISOString() },
];

/**
 * Rechnet einen Betrag zwischen zwei Währungen um, via Basis KZT.
 *   umrechnen(100, "EUR", "USD")
 *     = 100 EUR * 540 KZT/EUR / 500 KZT/USD = 108 USD
 */
export function umrechnen(
  betrag: number,
  von:    Waehrung,
  nach:   Waehrung,
  kurse:  Wechselkurs[]
): number {
  if (von === nach) return betrag;
  const vonK = kurse.find(k => k.waehrung === von);
  const nachK = kurse.find(k => k.waehrung === nach);
  if (!vonK || !nachK) return betrag;
  const inKzt = betrag * vonK.rate_to_kzt;
  return inKzt / nachK.rate_to_kzt;
}

/** Wechselkurs manuell setzen (Admin-Einstellungen) */
export async function wechselkursAktualisieren(
  waehrung: Waehrung,
  rate_to_kzt: number,
  quelle: string = "manuell"
): Promise<void> {
  await query(
    `UPDATE sebo.wechselkurse
     SET rate_to_kzt = $1, quelle = $2, aktualisiert_am = now()
     WHERE waehrung = $3`,
    [rate_to_kzt, quelle, waehrung]
  );
}
