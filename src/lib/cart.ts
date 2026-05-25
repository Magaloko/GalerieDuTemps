"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Cart, CartItem, CartBerechnung } from "@/types/commerce";

interface CartStore extends Cart {
  hinzufuegen:        (item: Omit<CartItem, "menge"> & { menge?: number }) => void;
  mengeAendern:       (produktId: string, menge: number) => void;
  entfernen:          (produktId: string) => void;
  leeren:             () => void;
  setCouponCode:      (code: string | undefined) => void;
  anzahlPositionen:   () => number;
  anzahlArtikel:      () => number;
}

const initial: Cart = {
  items:           [],
  coupon_code:     undefined,
  aktualisiert_am: Date.now(),
};

/** Galerie du Temps Cart-Store (persistent via localStorage) */
export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initial,

      hinzufuegen: (item) => set((state) => {
        const wunschMenge = item.menge ?? 1;
        const existing = state.items.find(i => i.produkt_id === item.produkt_id);

        if (existing) {
          const neueMenge = existing.menge + wunschMenge;
          const begrenzt  = item.max_menge ? Math.min(neueMenge, item.max_menge) : neueMenge;
          return {
            items: state.items.map(i =>
              i.produkt_id === item.produkt_id ? { ...i, menge: begrenzt } : i
            ),
            aktualisiert_am: Date.now(),
          };
        }

        const startMenge = item.max_menge ? Math.min(wunschMenge, item.max_menge) : wunschMenge;
        return {
          items: [...state.items, { ...item, menge: startMenge }],
          aktualisiert_am: Date.now(),
        };
      }),

      mengeAendern: (produktId, menge) => set((state) => {
        if (menge <= 0) {
          return {
            items: state.items.filter(i => i.produkt_id !== produktId),
            aktualisiert_am: Date.now(),
          };
        }
        return {
          items: state.items.map(i =>
            i.produkt_id === produktId
              ? { ...i, menge: i.max_menge ? Math.min(menge, i.max_menge) : menge }
              : i
          ),
          aktualisiert_am: Date.now(),
        };
      }),

      entfernen: (produktId) => set((state) => ({
        items: state.items.filter(i => i.produkt_id !== produktId),
        aktualisiert_am: Date.now(),
      })),

      leeren: () => set({ ...initial, aktualisiert_am: Date.now() }),

      setCouponCode: (code) => set({
        coupon_code:     code,
        aktualisiert_am: Date.now(),
      }),

      anzahlPositionen: () => get().items.length,
      anzahlArtikel:    () => get().items.reduce((acc, i) => acc + i.menge, 0),
    }),
    {
      name:     "vm_cart_v1",
      version:  1,
      partialize: (state) => ({
        items:           state.items,
        coupon_code:     state.coupon_code,
        aktualisiert_am: state.aktualisiert_am,
      }),
    }
  )
);

// ---------------------------------------------------------------------------
// Berechnungs-Helper (pure functions, server- und client-tauglich)
// ---------------------------------------------------------------------------
import { taxFromGross } from "./vat";

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

  // Steuer pro Position (proportionaler Rabatt-Anteil)
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

  // Versand-Steuer
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
