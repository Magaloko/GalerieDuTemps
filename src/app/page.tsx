import Link from "next/link";
import Image from "next/image";
import { featuredProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { ChatWidget } from "@/components/ai/chat-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { ProductPlaceholder } from "@/components/brand/product-placeholder";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";

export const metadata: Metadata = {
  title:       "Galerie du Temps — Винтажные сокровища с историей",
  description: "Эксклюзивная коллекция винтажных вещей. Алматы, Казахстан.",
};

export const revalidate = 3600;

/* ──────────────────────────────────────────────────────────────────────────
 * Home — Handoff A1 Editorial Hero (Cobalt).
 *
 * Aufbau:
 *  1. Hero: 2-col grid (1fr 1fr), links Display-XL H1 + 2 CTAs, rechts
 *     full-bleed Product-Image mit Floating Spec-Card.
 *  2. Ticker: 3-up status line in uppercase 11/0.2em.
 *  3. Featured (paper): Highlights-Grid.
 *  4. Story-Teaser (cobalt): tagline + CTA.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function HomePage() {
  const [produkte, kategorien, { t }] = await Promise.all([
    featuredProdukte(8).catch(() => []),
    alleKategorien().catch(() => []),
    getDictionary(),
  ]);

  const heroLot = produkte[0];
  const heroLotName = heroLot?.name;
  const heroLotPreis = heroLot
    ? formatPreis(heroLot.preis, (heroLot.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT")
    : "";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--color-paper)" }}>
      <SiteHeader />
      <main className="flex-1 pb-24 md:pb-0">

        {/* ─── HERO A1 (Cobalt) ──────────────────────────────────────── */}
        <section
          className="relative overflow-hidden"
          style={{ background: "var(--color-cobalt)", color: "var(--color-vintage-white)" }}
        >
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[600px] md:min-h-[640px]">

            {/* Left column */}
            <div className="px-6 sm:px-10 md:px-14 py-12 md:py-16 flex flex-col justify-center">
              {/* Eyebrow / tagline */}
              <p
                className="text-[11px] uppercase font-medium mb-8 md:mb-10"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                Rare pieces with history,<br className="hidden sm:inline" />
                {" "}elegance, and timeless charm.
              </p>

              {/* H1 — Display-XL, italic+coral last word */}
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   "clamp(3.5rem, 10vw, 6rem)",
                  lineHeight: 0.94,
                  letterSpacing: "-0.01em",
                  color: "var(--color-vintage-white)",
                }}
              >
                Редкие вещи<br />
                <em
                  className="font-italic"
                  style={{ color: "var(--color-coral)", fontStyle: "italic" }}
                >
                  с историей.
                </em>
              </h1>

              {/* Subhead */}
              <p
                className="mt-8 md:mt-10 max-w-md"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  fontSize:   15,
                  lineHeight: 1.7,
                  color:      "rgba(255,255,255,0.78)",
                }}
              >
                Кураторская подборка винтажа из Алматы — мебель, керамика, графика,
                текстиль. Каждый предмет проходит атрибуцию и реставрацию.
              </p>

              {/* CTAs */}
              <div className="mt-10 md:mt-12 flex flex-wrap items-center gap-4">
                <Link href="/katalog" className="btn-coral btn-coral-lg">
                  Открыть каталог <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/quiz" className="btn-coral btn-coral-ghost-light btn-coral-lg">
                  <Sparkles className="w-4 h-4" /> Пройти квиз
                </Link>
              </div>
            </div>

            {/* Right column — Product-Bild + Floating Spec-Card */}
            <div className="relative">
              {heroLot?.hauptbild_url ? (
                <Image
                  src={heroLot.hauptbild_url}
                  alt={heroLotName ?? "Featured Lot"}
                  fill
                  priority
                  sizes="(max-width:768px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <ProductPlaceholder
                  tone="velvet"
                  label="LOT 042"
                  sub="VELVET CHAIR"
                  ratio="3/4"
                  className="absolute inset-0"
                />
              )}

              {/* Floating Spec-Card — bottom: 60, left: -40, size 260 */}
              {heroLot && (
                <Link
                  href={`/katalog/${heroLot.slug}`}
                  className="hidden md:block absolute"
                  style={{
                    bottom: 60,
                    left:   -40,
                    width:  260,
                    background: "var(--color-paper)",
                    padding:    "20px 22px",
                    boxShadow:  "var(--shadow-lift)",
                  }}
                >
                  <p
                    className="text-[10px] uppercase font-medium mb-2"
                    style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
                  >
                    Лот {String(heroLot.id).padStart(3, "0")}
                  </p>
                  <h3
                    className="line-clamp-2"
                    style={{
                      fontFamily: "var(--font-italic)",
                      fontStyle:  "italic",
                      fontSize:   24,
                      lineHeight: 1.1,
                      color:      "var(--color-ink)",
                    }}
                  >
                    {heroLotName}
                  </h3>
                  <p
                    className="mt-3 text-right"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize:   22,
                      color:      "var(--color-coral)",
                      lineHeight: 1,
                    }}
                  >
                    {heroLotPreis}
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Ticker bar */}
          <div
            className="border-t"
            style={{ borderColor: "rgba(232,112,58,0.2)" }}
          >
            <div className="max-w-[1440px] mx-auto px-6 md:px-14 py-5 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 text-center md:text-left">
              <p className="text-[11px] uppercase font-medium" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.75)" }}>
                <span style={{ color: "var(--color-coral)" }}>◆</span> На складе ·{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>{produkte.length > 0 ? produkte.length * 40 : 342}</span> предметов
              </p>
              <p className="text-[11px] uppercase font-medium md:text-center" style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}>
                Новые поступления каждую среду
              </p>
              <p className="text-[11px] uppercase font-medium md:text-right" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.75)" }}>
                Доставка по СНГ ↗
              </p>
            </div>
          </div>
        </section>

        {/* ─── Featured (Paper) ───────────────────────────────────────── */}
        {produkte.length > 0 && (
          <section
            className="px-5 md:px-14 py-16 md:py-24"
            style={{ background: "var(--color-paper)" }}
          >
            <div className="max-w-[1440px] mx-auto">
              <header className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14 pb-6" style={{ borderBottom: "1px solid var(--color-line)" }}>
                <div>
                  <p
                    className="text-[11px] uppercase font-medium mb-2"
                    style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
                  >
                    {t.home.highlights_eyebrow}
                  </p>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize:   "clamp(2rem, 5vw, 3rem)",
                      lineHeight: 1,
                      color:      "var(--color-ink)",
                    }}
                  >
                    {t.home.highlights_titel}
                  </h2>
                </div>
                <Link
                  href="/katalog"
                  className="text-[11px] uppercase font-medium inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                  style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
                >
                  {t.home.alle_ansehen} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </header>
              <ProduktGrid
                produkte={produkte}
                leerText={t.home.leer_titel}
                leerUntertext={t.home.leer_text}
                prioCount={4}
              />
            </div>
          </section>
        )}

        {/* ─── Kategorien (Bone) ──────────────────────────────────────── */}
        {kategorien.length > 0 && (
          <section
            className="px-5 md:px-14 py-16 md:py-20"
            style={{ background: "var(--color-bone)" }}
          >
            <div className="max-w-[1440px] mx-auto">
              <div className="text-center mb-10">
                <p
                  className="text-[11px] uppercase font-medium mb-2"
                  style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
                >
                  {t.home.sortiment_eyebrow}
                </p>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   "clamp(2rem, 5vw, 3rem)",
                    color:      "var(--color-ink)",
                  }}
                >
                  {t.home.sortiment_titel}
                </h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                {kategorien.map(k => (
                  <Link
                    key={k.id}
                    href={`/kategorien/${k.slug}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 hover:opacity-80 transition-opacity"
                    style={{
                      border:     "1px solid var(--color-line)",
                      background: "var(--color-paper)",
                      color:      "var(--color-ink-soft)",
                      fontFamily: "var(--font-italic)",
                      fontStyle:  "italic",
                      fontSize:   14,
                    }}
                  >
                    {k.name}
                    {k.anzahl !== undefined && k.anzahl > 0 && (
                      <span style={{ color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                        {k.anzahl}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Story-Teaser (Cobalt) ──────────────────────────────────── */}
        <section
          className="px-6 md:px-14 py-16 md:py-24 text-center"
          style={{ background: "var(--color-cobalt)", color: "var(--color-vintage-white)" }}
        >
          <div className="max-w-3xl mx-auto">
            <p
              className="text-[11px] uppercase font-medium mb-4"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              {t.home.story_eyebrow}
            </p>
            <h2
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                fontSize:   "clamp(2rem, 5vw, 3rem)",
                color:      "var(--color-coral)",
                lineHeight: 1.1,
              }}
            >
              {t.home.story_titel}
            </h2>
            <p
              className="mt-6 leading-relaxed max-w-2xl mx-auto"
              style={{ color: "rgba(255,255,255,0.78)" }}
            >
              {t.home.story_text}
            </p>
            <Link
              href="/about"
              className="mt-10 inline-flex items-center gap-2 text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              {t.home.story_more} <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <p
              className="mt-14 text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)" }}
            >
              Galerie du Temps · Алматы
            </p>
          </div>
        </section>

      </main>
      <SiteFooter />
      <MobileTabBar t={t} />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
