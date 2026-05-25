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
      <main className="flex-1">

        {/* ─── Hero (Persönlichkeitstest-Stil) ────────────────────────── */}
        <section className="relative hero-vignette texture-paper overflow-hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-40 text-center">

            {/* Sparkle-Icon im Kreis */}
            <div
              className="inline-flex items-center justify-center w-16 h-16 mb-8 border border-vintage-gold/40"
              style={{ borderRadius: "50%", boxShadow: "var(--shadow-gold-glow)" }}
            >
              <Sparkles className="w-6 h-6 text-vintage-gold" />
            </div>

            {/* Eyebrow */}
            <p className="eyebrow mb-6">{t.home.hero_eyebrow}</p>

            {/* Headline — gemischt regulär + italic gold */}
            <h1 className="font-serif text-5xl md:text-6xl leading-[1.15] text-vintage-white mb-2">
              {t.home.hero_titel_1}
            </h1>
            <p className="font-serif text-5xl md:text-6xl leading-[1.15] italic text-vintage-gold mb-2">
              {t.home.hero_titel_em}
            </p>
            <h1 className="font-serif text-5xl md:text-6xl leading-[1.15] text-vintage-white mb-10">
              {t.home.hero_titel_2}
            </h1>

            <p className="text-vintage-cream/70 text-base font-sans max-w-md mx-auto mb-10 leading-relaxed">
              {t.home.hero_text}
            </p>

            <div className="flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/quiz"
                className="
                  inline-flex items-center gap-2
                  px-8 py-3.5
                  bg-vintage-gold text-vintage-espresso
                  font-sans text-xs tracking-[0.25em] uppercase
                  hover:bg-vintage-amber transition-colors
                "
                style={{ borderRadius: "var(--radius-button)" }}
              >
                {t.home.cta_kollektion} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/katalog"
                className="
                  inline-flex items-center
                  px-6 py-3.5
                  text-vintage-cream/50 hover:text-vintage-gold
                  font-sans text-xs tracking-[0.25em] uppercase
                  transition-colors
                "
              >
                {t.home.cta_anfrage}
              </Link>
            </div>
          </div>
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
