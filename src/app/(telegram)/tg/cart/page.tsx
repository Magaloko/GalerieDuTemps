import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { TelegramAuthGate } from "../auth-gate";
import { CartClient } from "./cart-client";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Корзина",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function TelegramCartPage() {
  const kaufenAktiv = await isFeatureEnabled("kaufen_aktiv").catch(() => true);

  // Schaufenster-Modus: keine Korzina. Hinweis + Weg zur Anfrage / zum Katalog.
  if (!kaufenAktiv) {
    return (
      <TelegramAuthGate>
        <main className="min-h-[60vh] flex items-center justify-center px-6 py-16">
          <div className="max-w-sm text-center">
            <p
              className="text-[11px] uppercase font-medium mb-3"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ✦ Витрина
            </p>
            <h1
              className="mb-4"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   26,
                lineHeight: 1.1,
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              Покупка сейчас по запросу
            </h1>
            <p
              className="text-sm mb-8"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
                lineHeight: 1.6,
              }}
            >
              Понравившуюся вещь можно зарезервировать через запрос — куратор
              свяжется с вами по наличию и доставке.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/tg"
                className="flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium"
                style={{
                  letterSpacing: "0.22em",
                  background:    "var(--color-coral)",
                  color:         "#fff",
                  touchAction:   "manipulation",
                }}
              >
                Открыть каталог <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/tg/kontakt"
                className="flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium"
                style={{
                  letterSpacing: "0.22em",
                  background:    "var(--tg-theme-section-bg-color, #fff)",
                  border:        "1px solid var(--color-line)",
                  color:         "var(--tg-theme-text-color, var(--color-ink))",
                  touchAction:   "manipulation",
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
                Связаться
              </Link>
            </div>
          </div>
        </main>
      </TelegramAuthGate>
    );
  }

  return (
    <TelegramAuthGate>
      <CartClient />
    </TelegramAuthGate>
  );
}
