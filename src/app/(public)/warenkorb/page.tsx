import { WarenkorbClient } from "./client";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:       "Корзина — Galerie du Temps",
  description: "Ваш выбор в Galerie du Temps",
};

export default async function WarenkorbPage() {
  const { t } = await getDictionary();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-1">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">{t.cart.titel}</h1>
      </div>
      <WarenkorbClient
        labels={{
          leer:            t.cart.leer,
          leer_text:       t.cart.leer_text,
          zum_katalog:     t.cart.zum_katalog,
          zusammenfassung: t.cart.zusammenfassung,
          coupon:          t.cart.coupon,
          code_aktiv:      t.cart.code_aktiv,
          code_eingeben:   t.cart.code_eingeben,
          zwischensumme:   t.cart.zwischensumme,
          rabatt:          t.cart.rabatt,
          versand:         t.cart.versand,
          versand_calc:    t.cart.versand_calc,
          inkl_ust:        t.cart.inkl_ust,
          summe:           t.cart.summe,
          zur_kasse:       t.cart.zur_kasse,
          laedt:           t.cart.laedt,
          sichere_zahlung: t.cart.sichere_zahlung,
          coupon_fehler:   t.cart.coupon_fehler,
          checkout_fehler: t.cart.checkout_fehler,
          entfernen:       t.cart.entfernen,
        }}
      />
    </div>
  );
}
