import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { veroeffentlichtePosts } from "@/lib/db/journal";
import { BookOpen, Calendar } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Журнал — Galerie du Temps",
  description: "Истории, советы по уходу и тренды винтажа.",
};

export const revalidate = 600;

export default async function JournalPage() {
  const [posts, { t, locale }] = await Promise.all([
    veroeffentlichtePosts(50).catch(() => []),
    getDictionary(),
  ]);
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ {t.journal_seite.eyebrow}</p>
          <h1 className="font-serif text-4xl text-vintage-cream">{t.journal_seite.titel}</h1>
          <p className="text-vintage-dust font-sans mt-3 max-w-xl mx-auto">
            {t.journal_seite.untertitel}
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-vintage-sand mx-auto mb-4" />
            <p className="font-serif text-vintage-cream/80">{t.journal_seite.keine_beitraege}</p>
            <p className="text-vintage-dust text-sm font-sans mt-1">{t.journal_seite.bald_wieder}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(p => (
              <Link key={p.id} href={`/journal/${p.slug}`}
                className="group bg-vintage-brown border border-vintage-sand/40 hover:border-vintage-gold transition-colors overflow-hidden"
                style={{ borderRadius: "var(--radius-card)" }}>
                {p.cover_bild_url && (
                  <div className="aspect-video bg-vintage-brown/40 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.cover_bild_url} alt={p.titel}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-5">
                  {p.tags.length > 0 && (
                    <p className="text-xs font-sans text-vintage-gold uppercase tracking-widest mb-2">{p.tags[0]}</p>
                  )}
                  <h2 className="font-serif text-lg text-vintage-cream group-hover:text-vintage-cream/80 transition-colors line-clamp-2">
                    {p.titel}
                  </h2>
                  {p.excerpt && <p className="text-vintage-dust text-sm font-sans mt-2 line-clamp-3">{p.excerpt}</p>}
                  <p className="text-xs text-vintage-dust font-sans mt-3 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {p.veroeffentlicht_am && new Date(p.veroeffentlicht_am).toLocaleDateString(bcp47)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
