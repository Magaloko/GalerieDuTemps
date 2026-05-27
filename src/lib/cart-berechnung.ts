// PURE Berechnungs-Helper — server- UND client-tauglich (KEIN "use client"!).
//
// Wird sowohl von /lib/cart.ts (Client-Zustand-Store) re-exportiert als
// auch direkt von Server-Routes (z.B. /api/checkout) importiert.
//
// Der vorherige Stand hatte berechneCart in /lib/cart.ts, die durch das
// "use client"-Directive komplett als Client-Modul markiert war.
// Server-Import → Next.js wirft "Attempted to call client function from
// the server" → /api/checkout crashte beim Cart-Submit.

import { taxFromGross } from "./vat";
import type { CartItem, CartBerechnung } from "@/types/commerce";

/**
 * Berechnet Cart-Totals.
 * Achtung: einzelpreis_cents ist BRUTTO. tax_rate dient zur Aufschlüsselung.
 *
 * @param items   Cart-Items
 * @param rabatt_cents Coupon-Rabatt (wird vom Subtotal abgezogen, danach proportional auf Items verteilt)
 * @param versand_cents Versandkosten (Brutto, immer Standard-Satz)
 * @param versand_rate Steuersatz für Versand (Default: 19)
 */
export function berechneCart(opts: {
  items:           Pick<CartItem, "einzelpreis_cents" | "menge" | "tax_rate" | "tax_exempt">[];
  rabatt_cents?:   number;
  versand_cents?:  number;
  versand_rate?:   number;
}): CartBerechnung {
  const items         = opts.items;
  const rabatt_cents  = opts.rabatt_cents  ?? 0;
  const versand_cents = opts.versand_cents ?? 0;
  const versand_rate  = opts.versand_rate  ?? 19;

  const subtotal_cents = items.reduce(
    (acc, i) => acc + i.einzelpreis_cents * i.menge, 0
  );

  const nach_rabatt = Math.max(0, subtotal_cents - rabatt_cents);

  const tax_breakdown: Record<string, { netto_cents: number; tax_cents: number }> = {};
  let tax_total_cents = 0;

  for (const item of items) {
    const item_brutto = item.einzelpreis_cents * item.menge;
    const item_anteil = subtotal_cents > 0 ? item_brutto / subtotal_cents : 0;
    const item_rabatt = Math.round(rabatt_cents * item_anteil);
    const item_brutto_nach_rabatt = item_brutto - item_rabatt;
    const item_tax    = taxFromGross(item_brutto_nach_rabatt, item.tax_rate);
    const item_netto  = item_brutto_nach_rabatt - item_tax;

    tax_total_cents += item_tax;
    const key = String(item.tax_rate);
    if (!tax_breakdown[key]) tax_breakdown[key] = { netto_cents: 0, tax_cents: 0 };
    tax_breakdown[key].netto_cents += item_netto;
    tax_breakdown[key].tax_cents   += item_tax;
  }

  if (versand_cents > 0) {
    const v_tax = taxFromGross(versand_cents, versand_rate);
    tax_total_cents += v_tax;
    const key = String(versand_rate);
    if (!tax_breakdown[key]) tax_breakdown[key] = { netto_cents: 0, tax_cents: 0 };
    tax_breakdown[key].netto_cents += versand_cents - v_tax;
    tax_breakdown[key].tax_cents   += v_tax;
  }

  const total_cents = nach_rabatt + versand_cents;

  return {
    subtotal_cents,
    rabatt_cents,
    versand_cents,
    tax_total_cents,
    total_cents,
    tax_breakdown,
  };
}
