import Link from "next/link";
import { featuredProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { SiteHeader }       from "@/components/layout/site-header";
import { SiteFooter }       from "@/components/layout/site-footer";
import { ChatWidget }   from "@/components/ai/chat-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:       "Galerie du Temps — Винтажные сокровища с историей",
  description: "Эксклюзивная коллекция винтажных вещей. Алматы, Казахстан.",
};

export const revalidate = 3600;

export default async function HomePage() {
  const [produkte, kategorien, { t }] = await Promise.all([
    featuredProdukte(8).catch(() => []),
    alleKategorien().catch(() => []),
    getDictionary(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-vintage-espresso">
      <SiteHeader />
      <main className="flex-1 pb-20 md:pb-0">

        {/* ─── Hero — Cobalt-Bühne mit Coral-Brand-Treatment ────────────── */}
        <section className="relative overflow-hidden bg-vintage-espresso">
          {/* Subtile radial highlight für Tiefe */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 30%, rgba(232,112,58,0.08) 0%, transparent 60%)",
            }}
          />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">

            {/* Eyebrow — wie auf der Tote-Bag */}
            <p className="text-vintage-gold text-[10px] sm:text-xs font-sans tracking-[0.4em] uppercase mb-12 md:mb-20">
              Rare pieces with history, elegance,<br className="hidden sm:block" />
              {" "}and timeless charm.
            </p>

            {/* Hauptbrand — gespreizt, dünn, Coral */}
            <h1 className="font-serif font-extralight text-vintage-gold leading-none mb-6
                           text-[3.5rem] sm:text-[5.5rem] md:text-[7rem] lg:text-[8.5rem]
                           tracking-[0.18em] sm:tracking-[0.22em] pl-[0.18em] sm:pl-[0.22em]">
              GALERIE
            </h1>

            {/* du Temps Subline */}
            <p className="font-serif italic text-vintage-gold
                          text-xl sm:text-2xl md:text-3xl
                          tracking-[0.2em] mb-16 md:mb-20">
              du Temps
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center items-center gap-3">
              <Link
                href="/katalog"
                className="inline-flex items-center gap-2 px-8 py-3.5
                           bg-vintage-gold text-vintage-espresso
                           font-sans text-xs tracking-[0.25em] uppercase font-medium
                           hover:bg-vintage-amber transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                {t.home.cta_kollektion} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/quiz"
                className="inline-flex items-center gap-2 px-6 py-3.5
                           border border-vintage-gold/40 text-vintage-gold
                           font-sans text-xs tracking-[0.25em] uppercase
                           hover:bg-vintage-gold/10 transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Sparkles className="w-3.5 h-3.5" /> {t.home.hero_eyebrow}
              </Link>
            </div>
          </div>

          {/* Dezente Trennlinie unten */}
          <div className="h-px bg-gradient-to-r from-transparent via-vintage-gold/30 to-transparent" />
        </section>

        {/* ─── Highlights ─────────────────────────────────────────────── */}
        {produkte.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center mb-16">
              <p className="eyebrow mb-4">{t.home.highlights_eyebrow}</p>
              <h2 className="font-serif text-4xl md:text-5xl text-vintage-white italic">
                {t.home.highlights_titel}
              </h2>
              <div className="divider-ornament max-w-xs mx-auto mt-6">
                <span className="text-vintage-gold text-lg">◆</span>
              </div>
            </div>
            <ProduktGrid produkte={produkte} leerText={t.home.leer_titel} leerUntertext={t.home.leer_text} prioCount={4} />
            <div className="mt-12 text-center">
              <Link href="/katalog" className="inline-flex items-center gap-2 px-8 py-3 border border-vintage-gold/40 text-vintage-gold font-sans text-xs tracking-[0.25em] uppercase hover:bg-vintage-gold hover:text-vintage-espresso transition-colors" style={{ borderRadius: "999px" }}>
                {t.home.alle_ansehen} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* ─── Kategorien ─────────────────────────────────────────────── */}
        {kategorien.length > 0 && (
          <section className="bg-vintage-brown py-24 border-y border-vintage-sand/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <p className="eyebrow mb-4">{t.home.sortiment_eyebrow}</p>
                <h2 className="font-serif text-4xl md:text-5xl text-vintage-white italic">
                  {t.home.sortiment_titel}
                </h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                {kategorien.map(k => (
                  <Link key={k.id} href={`/kategorien/${k.slug}`}
                    className="
                      px-6 py-3
                      border border-vintage-sand/40
                      text-vintage-cream/80 hover:text-vintage-gold
                      font-serif italic text-sm
                      hover:border-vintage-gold
                      transition-colors
                    "
                    style={{ borderRadius: "999px" }}>
                    {k.name}
                    {k.anzahl !== undefined && k.anzahl > 0 && (
                      <span className="ml-2 text-vintage-dust text-xs">({k.anzahl})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Story-Teaser ───────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <p className="eyebrow mb-4">{t.home.story_eyebrow}</p>
          <h2 className="font-serif text-3xl md:text-4xl italic text-vintage-gold mb-6">
            {t.home.story_titel}
          </h2>
          <p className="text-vintage-cream/70 leading-relaxed font-sans max-w-2xl mx-auto mb-10">
            {t.home.story_text}
          </p>
          <Link href="/about" className="inline-flex items-center gap-2 text-sm font-sans text-vintage-gold hover:text-vintage-amber transition-colors tracking-widest uppercase">
            {t.home.story_more} <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <div className="divider-ornament max-w-md mx-auto mt-16">
            <span className="text-vintage-gold text-base">◆</span>
          </div>
          <p className="text-vintage-dust text-xs font-sans tracking-[0.3em] uppercase mt-6">
            Galerie du Temps · Алматы
          </p>
        </section>

      </main>
      <SiteFooter />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
