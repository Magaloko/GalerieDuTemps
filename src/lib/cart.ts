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
// Re-Export der pure Berechnungs-Funktion aus cart-berechnung.ts (Server-safe).
// Diese Datei hat "use client" oben, was den Server-Import von berechneCart
// crashed — daher liegt der eigentliche Code in /lib/cart-berechnung.ts ohne
// Directive. Server-Routes sollten direkt aus dort importieren.
// ---------------------------------------------------------------------------
export { berechneCart } from "./cart-berechnung";
