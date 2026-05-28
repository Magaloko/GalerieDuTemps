import { WarenkorbClient } from "./client";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { TrustStrip } from "@/components/checkout/trust-strip";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:       "Корзина",
  description: "Ваш выбор в Galerie du Temps",
  alternates:  { canonical: "/warenkorb" },
  robots:      { index: false, follow: true },
};

export default async function WarenkorbPage() {
  const { t } = await getDictionary();
  return (
    <div
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      className="min-h-[100dvh] pb-32 lg:pb-16"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        <StepIndicator current="cart" />

        <header className="mb-8 text-center">
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Шаг 1
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2rem, 4.5vw, 2.75rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            {t.cart.titel}
          </h1>
        </header>

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

        <TrustStrip />
      </div>
    </div>
  );
}
