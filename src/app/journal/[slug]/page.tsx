import { notFound } from "next/navigation";
import Link from "next/link";
import { postBySlug, postAufrufenInkrement, aehnlichePosts } from "@/lib/db/journal";
import { markdownToHtml } from "@/lib/utils/markdown";
import { LandingBlocks } from "@/components/landing/landing-blocks";
import { blockText } from "@/lib/utils/i18n-text";
import { JournalPostCard } from "@/components/journal/post-card";
import {
  ChevronLeft, Calendar, Eye, Clock, Share2,
} from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await postBySlug(slug).catch(() => null);
  if (!p) return { title: "Запись не найдена" };
  return {
    title:       p.seo_titel ?? p.titel,
    description: p.seo_beschreibung ?? p.excerpt ?? undefined,
    alternates:  { canonical: `/journal/${p.slug}` },
    openGraph: {
      title:       p.seo_titel ?? p.titel,
      description: p.seo_beschreibung ?? p.excerpt ?? undefined,
      type:        "article",
      images:      p.cover_bild_url ? [{ url: p.cover_bild_url }] : undefined,
      publishedTime: p.veroeffentlicht_am ?? undefined,
      authors:     p.autor_name ? [p.autor_name] : undefined,
    },
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

  // View-Counter (best-effort, blocking nicht nötig)
  postAufrufenInkrement(slug).catch(() => {});

  // Block-Builder hat Vorrang; nur Bestandsposts ohne Blocks fallen auf Markdown
  // zurück (Abwärtskompatibilität).
  const hatBlocks = Array.isArray(post.blocks) && post.blocks.length > 0;

  // Reading-Time-Schätzung (200 Wörter/Min für RU-Texte)
  const textZumZaehlen = hatBlocks
    ? post.blocks
        .map((b) =>
          [
            blockText(b.titel, locale), blockText(b.subtitel, locale), blockText(b.text, locale),
            blockText(b.quote, locale), blockText(b.frage, locale), blockText(b.antwort, locale),
            blockText(b.caption, locale),
          ].join(" "),
        )
        .join(" ")
    : post.markdown;
  const wordCount = textZumZaehlen.split(/\s+/).filter(Boolean).length;
  const readMin   = Math.max(1, Math.round(wordCount / 200));

  // Related posts (gleicher Tag oder Fallback latest)
  const related = await aehnlichePosts(slug, post.tags, 3).catch(() => []);

  // Markdown → sanitiziertes HTML (DOMPurify, kein XSS via stored content) —
  // nur als Fallback, wenn keine Blocks vorhanden sind.
  const html = hatBlocks ? "" : markdownToHtml(post.markdown);

  return (
    <div
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      className="min-h-[100dvh]"
    >
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">

        {/* ─── Breadcrumb ───────────────────────────────────── */}
        <nav
          className="mb-8 flex items-center gap-2 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          <Link
            href="/journal"
            className="flex items-center gap-1 transition-colors hover:text-[var(--color-coral)]"
          >
            <ChevronLeft className="w-3 h-3" /> {t.journal_seite.zurueck}
          </Link>
        </nav>

        {/* ─── Header ───────────────────────────────────────── */}
        <header className="mb-10">
          {post.tags.length > 0 && (
            <p
              className="text-[11px] uppercase font-medium mb-4"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ✦ {post.tags.join(" · ")}
            </p>
          )}
          <h1
            className="mb-5"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.25rem, 5vw, 3.5rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            {post.titel}
          </h1>

          {post.excerpt && (
            <p
              className="text-lg max-w-2xl"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-soft)",
                lineHeight: 1.6,
              }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Meta-Bar */}
          <div
            className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 pt-5"
            style={{ borderTop: "1px solid var(--color-line)" }}
          >
            {post.autor_name && (
              <MetaItem icon={null} text={`${t.journal_seite.autor_von} ${post.autor_name}`} />
            )}
            {post.veroeffentlicht_am && (
              <MetaItem
                icon={Calendar}
                text={new Date(post.veroeffentlicht_am).toLocaleDateString(bcp47, {
                  day: "numeric", month: "long", year: "numeric",
                })}
              />
            )}
            <MetaItem icon={Clock} text={`${readMin} мин чтения`} />
            <MetaItem icon={Eye} text={`${post.aufrufe + 1} ${t.journal_seite.aufrufe}`} />
          </div>
        </header>

        {/* ─── Cover ────────────────────────────────────────── */}
        {post.cover_bild_url && (
          <div
            className="overflow-hidden mb-10 -mx-4 sm:mx-0"
            style={{ background: "var(--color-bone)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_bild_url}
              alt={post.titel}
              className="w-full h-auto object-cover"
              style={{ maxHeight: 520 }}
            />
          </div>
        )}

        {/* ─── Article Body ─────────────────────────────────── */}
        {hatBlocks ? (
          <LandingBlocks blocks={post.blocks} locale={locale} />
        ) : (
          <div
            className="journal-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* ─── Share Strip ──────────────────────────────────── */}
        <ShareStrip slug={post.slug} titel={post.titel} />
      </article>

      {/* ─── Related Posts ───────────────────────────────────── */}
      {related.length > 0 && (
        <section
          className="border-t mt-10"
          style={{
            borderColor: "var(--color-line)",
            background:  "var(--color-bone)",
          }}
        >
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-14 py-12 md:py-16">
            <h2
              className="text-[11px] uppercase font-medium mb-6"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ✦ Похожие статьи
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map(r => (
                <JournalPostCard key={r.id} post={r} bcp47={bcp47} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Prose-Styles (scoped via .journal-prose) ──────── */}
      <style>{`
        .journal-prose {
          font-family: var(--font-sans);
          font-size: 17px;
          line-height: 1.75;
          color: var(--color-ink);
          max-width: none;
        }
        .journal-prose > p:first-of-type::first-letter {
          font-family: var(--font-display);
          font-size: 4.5em;
          float: left;
          line-height: 0.85;
          margin: 0.1em 0.12em 0 0;
          color: var(--color-coral);
        }
        .journal-prose p { margin: 1.25em 0; }
        .journal-prose h2 {
          font-family: var(--font-display);
          font-size: 1.7em;
          line-height: 1.2;
          margin: 2em 0 0.6em;
          color: var(--color-ink);
        }
        .journal-prose h3 {
          font-family: var(--font-display);
          font-size: 1.3em;
          line-height: 1.25;
          margin: 1.6em 0 0.5em;
          color: var(--color-ink);
        }
        .journal-prose a {
          color: var(--color-coral);
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
          transition: opacity 150ms;
        }
        .journal-prose a:hover { opacity: 0.7; }
        .journal-prose strong { color: var(--color-ink); font-weight: 600; }
        .journal-prose em { font-family: var(--font-italic); font-style: italic; }
        .journal-prose blockquote {
          border-left: 3px solid var(--color-coral);
          padding-left: 1.25em;
          margin: 1.5em 0;
          font-family: var(--font-italic);
          font-style: italic;
          font-size: 1.15em;
          color: var(--color-ink-soft);
          line-height: 1.6;
        }
        .journal-prose ul, .journal-prose ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }
        .journal-prose li { margin: 0.4em 0; }
        .journal-prose img {
          margin: 2em auto;
          max-width: 100%;
          height: auto;
        }
        .journal-prose hr {
          border: 0;
          height: 1px;
          background: var(--color-line);
          margin: 2.5em auto;
          width: 30%;
        }
        .journal-prose code {
          font-family: var(--font-mono);
          font-size: 0.9em;
          background: var(--color-bone);
          padding: 0.15em 0.4em;
          border: 1px solid var(--color-line);
        }
        .journal-prose pre {
          background: var(--color-bone);
          border: 1px solid var(--color-line);
          padding: 1em;
          overflow-x: auto;
          font-size: 14px;
          margin: 1.5em 0;
        }
        .journal-prose pre code {
          background: none;
          border: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────── */

function MetaItem({ icon: Icon, text }: { icon: React.ElementType | null; text: string }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[11px]"
      style={{ color: "var(--color-ink-mute)" }}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {text}
    </span>
  );
}

function ShareStrip({ slug, titel }: { slug: string; titel: string }) {
  // Server-Component-Konfiguration — Share-URLs werden client-seitig
  // mit window.location aufgelöst. Hier nur statische Links zu Plattform-
  // Share-Endpoints; navigator.share als Fallback macht der Button selbst.
  return (
    <div
      className="flex flex-wrap items-center gap-3 mt-12 pt-6"
      style={{ borderTop: "1px solid var(--color-line)" }}
    >
      <p
        className="flex items-center gap-1.5 text-[10px] uppercase font-medium"
        style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
      >
        <Share2 className="w-3 h-3" /> Поделиться
      </p>
      <ShareButtons slug={slug} titel={titel} />
    </div>
  );
}

function ShareButtons({ slug, titel }: { slug: string; titel: string }) {
  // Static Telegram/WhatsApp share-links — Server-rendered, kein "use client" nötig
  const url     = `/journal/${slug}`;  // wird vom Provider mit Origin gemergt
  const enc     = encodeURIComponent;
  const tgLink  = `https://t.me/share/url?url=${enc(url)}&text=${enc(titel)}`;
  const waLink  = `https://wa.me/?text=${enc(`${titel} — ${url}`)}`;
  const items: Array<{ href: string; label: string }> = [
    { href: tgLink, label: "Telegram" },
    { href: waLink, label: "WhatsApp" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ href, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 text-[11px] uppercase font-medium transition-colors hover:text-[var(--color-coral)]"
          style={{
            letterSpacing: "0.22em",
            color:         "var(--color-ink-soft)",
            background:    "#fff",
            border:        "1px solid var(--color-line)",
          }}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
