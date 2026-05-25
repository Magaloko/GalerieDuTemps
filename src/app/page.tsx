import Link from "next/link";
import { featuredProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import { SiteHeader }       from "@/components/layout/site-header";
import { SiteFooter }       from "@/components/layout/site-footer";
import { ChatWidget }   from "@/components/ai/chat-widget";
import { CookieBanner } from "@/components/cookie-banner";
import { ArrowRight }   from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:       "Galerie du Temps — Винтажные сокровища с историей",
  description: "Откройте для себя тщательно отобранные винтажные вещи. Мебель, декор, украшения и многое другое.",
};

export const revalidate = 3600;

export default async function HomePage() {
  const [produkte, kategorien, { t }] = await Promise.all([
    featuredProdukte(8).catch(() => []),
    alleKategorien().catch(() => []),
    getDictionary(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">

        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <section className="relative bg-vintage-espresso texture-paper overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
            <div className="max-w-2xl">
              <p className="text-vintage-gold text-sm tracking-[0.3em] uppercase mb-4">
                ✦ &nbsp; {t.home.hero_eyebrow}
              </p>
              <h1 className="font-serif text-4xl md:text-6xl text-vintage-cream leading-tight mb-6">
                {t.home.hero_titel_1}{" "}
                <em className="text-vintage-gold not-italic">{t.home.hero_titel_em}</em>
              </h1>
              <p className="text-vintage-cream/70 text-lg leading-relaxed mb-10 font-sans">
                {t.home.hero_text}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/katalog"
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 bg-vintage-gold text-vintage-espresso
                    font-sans text-sm tracking-widest uppercase
                    hover:bg-vintage-copper transition-colors
                  "
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  {t.home.cta_kollektion} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/kontakt"
                  className="
                    inline-flex items-center gap-2
                    px-8 py-4 border border-vintage-cream/30
                    text-vintage-cream font-sans text-sm tracking-widest uppercase
                    hover:bg-vintage-cream/10 transition-colors
                  "
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  {t.home.cta_anfrage}
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vintage-gold/30 to-transparent" />
        </section>

        {/* ─── Featured ─────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ {t.home.highlights_eyebrow}</p>
              <h2 className="font-serif text-3xl text-vintage-espresso">{t.home.highlights_titel}</h2>
            </div>
            <Link href="/katalog" className="hidden md:flex items-center gap-2 text-sm font-sans text-vintage-brown hover:text-vintage-espresso transition-colors">
              {t.home.alle_ansehen} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <ProduktGrid produkte={produkte} leerText={t.home.leer_titel} leerUntertext={t.home.leer_text} prioCount={4} />
          <div className="mt-10 text-center md:hidden">
            <Link href="/katalog" className="inline-flex items-center gap-2 px-6 py-3 border border-vintage-sand text-vintage-brown font-sans text-sm tracking-widest uppercase hover:bg-vintage-parchment transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
              {t.footer.alle_produkte} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ─── Kategorien ───────────────────────────────────────────── */}
        {kategorien.length > 0 && (
          <section className="bg-vintage-parchment py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ {t.home.sortiment_eyebrow}</p>
                <h2 className="font-serif text-3xl text-vintage-espresso">{t.home.sortiment_titel}</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {kategorien.map(k => (
                  <Link key={k.id} href={`/kategorien/${k.slug}`}
                    className="px-6 py-3 bg-vintage-white border border-vintage-sand text-vintage-brown font-sans text-sm hover:bg-vintage-espresso hover:text-vintage-cream hover:border-vintage-espresso transition-colors group"
                    style={{ borderRadius: "var(--radius-card)" }}>
                    {k.name}
                    {k.anzahl !== undefined && k.anzahl > 0 && (
                      <span className="ml-2 text-vintage-dust text-xs group-hover:text-vintage-cream/60">({k.anzahl})</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Über uns Teaser ──────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center p-10 md:p-16 bg-vintage-parchment border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
            <div>
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦ {t.home.story_eyebrow}</p>
              <h2 className="font-serif text-3xl text-vintage-espresso mb-5">{t.home.story_titel}</h2>
              <p className="text-vintage-brown leading-relaxed font-sans mb-6">
                {t.home.story_text}
              </p>
              <Link href="/about" className="inline-flex items-center gap-2 text-sm font-sans text-vintage-gold hover:text-vintage-copper transition-colors">
                {t.home.story_more} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { zahl: "100+", label: t.home.stat_stuecke },
                { zahl: "10+",  label: t.home.stat_jahre },
                { zahl: "∞",    label: t.home.stat_geschichten },
              ].map(({ zahl, label }) => (
                <div key={label} className="py-6">
                  <p className="font-serif text-4xl text-vintage-gold">{zahl}</p>
                  <p className="text-vintage-dust text-xs font-sans uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
