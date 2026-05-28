import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { oeffentlichesProduktBySlug, aehnlicheProdukte } from "@/lib/db/produkte-public";
import { TelegramAuthGate } from "../../auth-gate";
import { ProductMiniClient } from "./product-client";
import { HeartToggle } from "../../heart-toggle";
import { ProduktStory } from "@/components/produkte/produkt-story";
import { maskBestandListe } from "@/lib/utils/showcase-mask";
import { formatPreis } from "@/lib/utils/preis";
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
  const { isFeatureEnabled } = await import("@/lib/db/feature-flags");
  const [produkt, locale, kaufenAktiv] = await Promise.all([
    oeffentlichesProduktBySlug(slug),
    getLocale(),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);
  if (!produkt) notFound();

  const name = i18nOr(produkt.name_i18n,             locale, produkt.name);
  const kurz = i18nOr(produkt.kurzbeschreibung_i18n, locale, produkt.kurzbeschreibung);
  const reserviert = !!produkt.reserviert_bis && new Date(produkt.reserviert_bis) > new Date() && !produkt.verkauft;

  // Galerie: alle Bilder (sortiert), Fallback auf Hauptbild.
  const galerie = (() => {
    const urls = (produkt.bilder ?? []).map(b => b.url).filter(Boolean);
    if (urls.length) return urls;
    return produkt.hauptbild_url ? [produkt.hauptbild_url] : [];
  })();
  const hatStory = (produkt.inhalt_blocks?.length ?? 0) > 0;

  // „Похожее" — gleiche Kategorie, ähnlicher Preis. Bestand maskiert (Schaufenster).
  const aehnliche = maskBestandListe(
    await aehnlicheProdukte(produkt.id, produkt.kategorie_id ?? null, produkt.preis, 4).catch(() => []),
    kaufenAktiv,
  );

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

        {/* Bild-Galerie: horizontal swipebar (scroll-snap), Foto-Zähler */}
        <div className="relative">
          <div
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {galerie.length > 0 ? galerie.map((url, i) => (
              <div
                key={i}
                className="relative w-full shrink-0 snap-center"
                style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}
              >
                <Image src={url} alt={name} fill sizes="100vw" className="object-cover" priority={i === 0} />
              </div>
            )) : (
              <div className="relative w-full shrink-0" style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }} />
            )}
          </div>
          {galerie.length > 1 && (
            <span
              className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "rgba(15,20,48,0.7)", color: "#fff", borderRadius: 999, backdropFilter: "blur(4px)" }}
            >
              📷 {galerie.length}
            </span>
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
          <div className="flex items-start gap-3">
            <h1
              className="flex-1 min-w-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   28,
                lineHeight: 1.1,
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              {name}
            </h1>
            {/* Heart-Toggle inline neben dem Titel */}
            <HeartToggle produktId={produkt.id} size={20} />
          </div>
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

          {/* Reserviert-Badge (binär, beide Modi) */}
          {reserviert && (
            <p
              className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    "rgba(201,168,76,0.12)",
                color:         "#9A7B1F",
                border:        "1px solid rgba(201,168,76,0.40)",
              }}
            >
              ⏳ Зарезервировано
            </p>
          )}

          {/* Shop-Modus: «Последний экземпляр»-Pulse (Verknappungs-Taktik, mit Stückzahl-Bezug) */}
          {kaufenAktiv && !reserviert && !produkt.verkauft && produkt.lagerbestand === 1 && (
            <p
              className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    "rgba(232,112,58,0.10)",
                color:         "var(--color-coral)",
                border:        "1px solid rgba(232,112,58,0.40)",
                animation:     "tg-pulse-coral 1.8s ease-in-out infinite",
              }}
            >
              ⚠ Последний экземпляр
            </p>
          )}

          {/* Schaufenster-Modus: nur binäre Verfügbarkeit, KEINE Stückzahl.
              Bei Reservierung übernimmt das Reserviert-Badge oben. */}
          {!kaufenAktiv && !reserviert && (
            <p
              className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    produkt.verkauft || produkt.lagerbestand <= 0 ? "rgba(120,120,120,0.12)" : "rgba(127,140,90,0.12)",
                color:         produkt.verkauft || produkt.lagerbestand <= 0 ? "var(--color-ink-mute)" : "#52663F",
                border:        `1px solid ${produkt.verkauft || produkt.lagerbestand <= 0 ? "rgba(120,120,120,0.30)" : "rgba(127,140,90,0.40)"}`,
              }}
            >
              {produkt.verkauft ? "Продано" : produkt.lagerbestand > 0 ? "✓ В наличии" : "Нет в наличии"}
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

          {/* Editorial-Story (block-basiert) — wie auf der Web-Detailseite */}
          {hatStory && (
            <div className="mt-6">
              <ProduktStory blocks={produkt.inhalt_blocks} locale={locale} />
            </div>
          )}

          {/* „Спросить куратора" — Frage über dieses Produkt */}
          <Link
            href={`/tg/kontakt?produkt=${produkt.id}&name=${encodeURIComponent(name)}`}
            className="mt-5 flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium"
            style={{
              letterSpacing: "0.22em",
              background:    "var(--tg-theme-section-bg-color, #fff)",
              border:        "1px solid var(--color-line)",
              color:         "var(--tg-theme-text-color, var(--color-ink))",
              touchAction:   "manipulation",
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
            Спросить куратора
          </Link>

          {/* „Зарезервировать" — Bron-Anfrage, nur wenn verfügbar & nicht reserviert */}
          {!reserviert && !produkt.verkauft && produkt.lagerbestand > 0 && (
            <Link
              href={`/tg/kontakt?produkt=${produkt.id}&name=${encodeURIComponent(name)}&intent=reserve`}
              className="mt-2 flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    "transparent",
                border:        "1px solid rgba(201,168,76,0.55)",
                color:         "#9A7B1F",
                touchAction:   "manipulation",
              }}
            >
              ⏳ Зарезервировать
            </Link>
          )}
        </div>

        {/* „Похожее" — ähnliche Produkte (gleiche Kategorie, ähnlicher Preis) */}
        {aehnliche.length > 0 && (
          <section className="px-4 pt-2">
            <h2
              className="text-[11px] uppercase font-medium mb-3"
              style={{
                letterSpacing: "0.22em",
                color:         "var(--tg-theme-link-color, var(--color-coral))",
              }}
            >
              Похожее
            </h2>
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {aehnliche.map(a => {
                const w = (a.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
                return (
                  <Link
                    key={a.id}
                    href={`/tg/produkt/${a.slug}`}
                    className="block shrink-0"
                    style={{ width: 132, touchAction: "manipulation" }}
                  >
                    <div
                      className="relative w-full overflow-hidden"
                      style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}
                    >
                      {a.hauptbild_url && (
                        <Image src={a.hauptbild_url} alt={a.name} fill sizes="132px" className="object-cover" />
                      )}
                      {(a.verkauft || a.reserviert) && (
                        <span
                          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] uppercase font-medium"
                          style={{
                            letterSpacing: "0.14em",
                            background:    a.verkauft ? "rgba(15,20,48,0.82)" : "rgba(201,168,76,0.92)",
                            color:         a.verkauft ? "var(--color-gold, #C9A84C)" : "#1a1410",
                            backdropFilter:"blur(4px)",
                          }}
                        >
                          {a.verkauft ? "Продано" : "Зарезервировано"}
                        </span>
                      )}
                    </div>
                    <h3
                      className="line-clamp-2 mt-1.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   14,
                        lineHeight: 1.15,
                        color:      "var(--tg-theme-text-color, var(--color-ink))",
                      }}
                    >
                      {a.name}
                    </h3>
                    <p
                      className="mt-0.5"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   13,
                        color:      "var(--tg-theme-text-color, var(--color-ink))",
                      }}
                    >
                      {formatPreis(a.preis, w)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Keyframes für Pulse-Badge (server-render-time CSS) */}
        <style>{`
          @keyframes tg-pulse-coral {
            0%, 100% { box-shadow: 0 0 0 0 rgba(232,112,58,0.5); }
            50%      { box-shadow: 0 0 0 6px rgba(232,112,58,0); }
          }
        `}</style>

        {/* MainButton-Mount-Punkt (kein visuelles Markup, nur side-effect) */}
        <ProductMiniClient
          produktId={produkt.id}
          slug={produkt.slug}
          name={name}
          bildUrl={produkt.hauptbild_url ?? produkt.bilder?.[0]?.url ?? null}
          preisCents={Math.round(produkt.preis * 100)}
          /* Schaufenster: exakten Bestand NICHT in den Client-Payload geben. */
          lagerbestand={kaufenAktiv ? produkt.lagerbestand : (produkt.lagerbestand > 0 ? 1 : 0)}
          verkauft={produkt.verkauft}
          reserviert={reserviert}
          waehrung={(produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB") ?? "KZT"}
          kaufenAktiv={kaufenAktiv}
        />
      </main>
    </TelegramAuthGate>
  );
}
