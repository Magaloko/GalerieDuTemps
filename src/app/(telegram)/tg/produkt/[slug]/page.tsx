import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { oeffentlichesProduktBySlug } from "@/lib/db/produkte-public";
import { TelegramAuthGate } from "../../auth-gate";
import { ProductMiniClient } from "./product-client";
import { i18nOr } from "@/lib/utils/i18n-text";
import { getLocale } from "@/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galerie · Produkt",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/produkt/[slug] — Mini-App Produkt-Detail
 *
 * Server lädt Produkt + Locale. Client kümmert sich um Telegram-MainButton:
 * `tg.MainButton.setText("В корзину") + show()` statt eines eigenen
 * Buttons im UI — Telegram-Convention für klare Hauptaktion.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TelegramProduktPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [produkt, locale] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getLocale(),
  ]);
  if (!produkt) notFound();

  const name = i18nOr(produkt.name_i18n,             locale, produkt.name);
  const kurz = i18nOr(produkt.kurzbeschreibung_i18n, locale, produkt.kurzbeschreibung);

  return (
    <TelegramAuthGate>
      <main className="pb-32">

        {/* Back */}
        <div className="px-4 py-3">
          <Link
            href="/tg"
            className="inline-flex items-center gap-1 text-[11px] uppercase font-medium"
            style={{
              letterSpacing: "0.18em",
              color:         "var(--tg-theme-link-color, var(--color-coral))",
            }}
          >
            <ChevronLeft className="w-3 h-3" /> Каталог
          </Link>
        </div>

        {/* Bild */}
        <div
          className="relative w-full"
          style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}
        >
          {produkt.hauptbild_url && (
            <Image
              src={produkt.hauptbild_url}
              alt={name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {produkt.kategorie_name && (
            <p
              className="text-[10px] uppercase font-medium mb-2"
              style={{
                letterSpacing: "0.28em",
                color:         "var(--tg-theme-link-color, var(--color-coral))",
              }}
            >
              {produkt.kategorie_name}
            </p>
          )}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   28,
              lineHeight: 1.1,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
            }}
          >
            {name}
          </h1>
          {produkt.era && (
            <p
              className="mt-2 text-sm"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              }}
            >
              {produkt.era}
            </p>
          )}
          {kurz && (
            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: "var(--tg-theme-text-color, var(--color-ink-soft))" }}
            >
              {kurz}
            </p>
          )}
        </div>

        {/* MainButton-Mount-Punkt (kein visuelles Markup, nur side-effect) */}
        <ProductMiniClient
          produktId={produkt.id}
          slug={produkt.slug}
          name={name}
          bildUrl={produkt.hauptbild_url ?? produkt.bilder?.[0]?.url ?? null}
          preisCents={Math.round(produkt.preis * 100)}
          lagerbestand={produkt.lagerbestand}
          verkauft={produkt.verkauft}
          waehrung={(produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB") ?? "KZT"}
        />
      </main>
    </TelegramAuthGate>
  );
}
