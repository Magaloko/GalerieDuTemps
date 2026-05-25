import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { postBySlug, postAufrufenInkrement } from "@/lib/db/journal";
import { marked } from "marked";
import { ChevronLeft, Calendar, Eye } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await postBySlug(slug).catch(() => null);
  if (!p) return { title: "Запись не найдена" };
  return {
    title:       p.seo_titel ?? `${p.titel} — Galerie du Temps`,
    description: p.seo_beschreibung ?? p.excerpt ?? undefined,
  };
}

export default async function JournalDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, { t, locale }] = await Promise.all([
    postBySlug(slug),
    getDictionary(),
  ]);
  if (!post || !post.veroeffentlicht) notFound();
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  // Aufrufe-Counter (Best-Effort)
  postAufrufenInkrement(slug).catch(() => {});

  // Markdown → HTML
  marked.setOptions({ gfm: true, breaks: false });
  const html = marked.parse(post.markdown ?? "") as string;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="mb-6 text-xs font-sans text-vintage-dust">
          <Link href="/journal" className="hover:text-vintage-brown flex items-center gap-1 transition-colors w-fit">
            <ChevronLeft className="w-3 h-3" /> {t.journal_seite.zurueck}
          </Link>
        </nav>

        <article>
          <header className="mb-8">
            {post.tags.length > 0 && (
              <p className="text-xs font-sans text-vintage-gold uppercase tracking-widest mb-3">
                {post.tags.join(" · ")}
              </p>
            )}
            <h1 className="font-serif text-4xl text-vintage-espresso leading-tight mb-4">{post.titel}</h1>
            <div className="flex flex-wrap gap-4 text-xs text-vintage-dust font-sans">
              {post.autor_name && <span>{t.journal_seite.autor_von} {post.autor_name}</span>}
              {post.veroeffentlicht_am && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {new Date(post.veroeffentlicht_am).toLocaleDateString(bcp47)}
                </span>
              )}
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.aufrufe + 1} {t.journal_seite.aufrufe}</span>
            </div>
          </header>

          {post.cover_bild_url && (
            <div className="aspect-video mb-8 overflow-hidden bg-vintage-parchment" style={{ borderRadius: "var(--radius-card)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_bild_url} alt={post.titel} className="w-full h-full object-cover" />
            </div>
          )}

          <div
            className="prose max-w-none font-sans text-vintage-ink leading-relaxed
                       prose-headings:font-serif prose-headings:text-vintage-espresso
                       prose-a:text-vintage-brown prose-a:underline
                       prose-strong:text-vintage-espresso
                       prose-blockquote:border-l-vintage-gold prose-blockquote:text-vintage-brown
                       prose-img:rounded"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
