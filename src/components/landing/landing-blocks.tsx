import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";
import type { LandingBlock } from "@/types/landing";
import type { ProduktListItem } from "@/types/produkt";
import { storyBgCss } from "@/components/produkte/story-bg";
import { blockText } from "@/lib/utils/i18n-text";
import { ProduktKarte } from "@/components/produkte/produkt-karte";
import {
  featuredProdukte,
  katalogProdukte,
} from "@/lib/db/produkte-public";
import { landingProdukteBySlugs } from "@/lib/db/landing-pages";
import type { Locale } from "@/i18n/types";

/* ──────────────────────────────────────────────────────────────────────────
 * LandingBlocks — rendert das Block-Array einer Landing-Page (Server-Component).
 *
 * Markenkonform (eckig, Coral-Akzent, serif Headlines, RU-Default). React
 * escaped Text automatisch — kein dangerouslySetInnerHTML. product_grid lädt
 * seine Produkte serverseitig in einer eigenen async Sub-Server-Component.
 * ────────────────────────────────────────────────────────────────────────── */

/** YouTube/Vimeo/Direkt-Video → Embed (wie produkt-story.tsx). */
function videoEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return null;
}

const alignCls = (a?: string) =>
  a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

export async function LandingBlocks({
  blocks,
  locale,
}: {
  blocks: LandingBlock[];
  locale: Locale;
}) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="w-full">
      {blocks.map((b, i) => (
        <LandingBlockRenderer key={i} block={b} locale={locale} />
      ))}
    </div>
  );
}

/* ── Einzel-Block (async wegen product_grid) ──────────────────────────────── */
async function LandingBlockRenderer({
  block: b,
  locale,
}: {
  block: LandingBlock;
  locale: Locale;
}) {
  const bg = storyBgCss(b.bg);

  const inner = await renderInner(b, locale);
  if (!inner) return null;

  // Volle-Breite-Blöcke (hero/cta_band) ohne Container; Rest in lesbarer Spalte.
  const fullBleed = b.type === "hero" || b.type === "cta_band";

  if (fullBleed) {
    return <section style={bg ? { background: bg } : undefined}>{inner}</section>;
  }

  return (
    <section style={bg ? { background: bg } : undefined}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">{inner}</div>
    </section>
  );
}

async function renderInner(b: LandingBlock, locale: Locale): Promise<React.ReactNode> {
  const titel = blockText(b.titel, locale);
  const subtitel = blockText(b.subtitel, locale);
  const text = blockText(b.text, locale);
  const ctaLabel = blockText(b.cta_label, locale);
  const caption = blockText(b.caption, locale);
  const quote = blockText(b.quote, locale);
  const autor = blockText(b.autor, locale);

  switch (b.type) {
    case "hero": {
      const v = b.video_url ? videoEmbed(b.video_url) : null;
      return (
        <div
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{ minHeight: "min(80vh, 640px)", background: "var(--color-cobalt, #1B2566)" }}
        >
          {/* Hintergrund: Video > Bild */}
          {v && v.kind === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={v.src}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : b.bild_url ? (
            <Image
              src={b.bild_url}
              alt={titel}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          {/* Abdunkelung für Lesbarkeit */}
          <div className="absolute inset-0" style={{ background: "rgba(15,20,48,0.45)" }} />
          <div className={`relative z-10 px-6 py-16 max-w-3xl ${alignCls(b.align ?? "center")}`}>
            {titel && (
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 6vw, 3.75rem)",
                  color: "#fff",
                  lineHeight: 1.05,
                }}
              >
                {titel}
              </h1>
            )}
            {subtitel && (
              <p className="mt-4 text-lg md:text-xl" style={{ color: "rgba(255,255,255,0.88)", lineHeight: 1.5 }}>
                {subtitel}
              </p>
            )}
            {b.cta_url && (
              <div className="mt-7">
                <Link
                  href={b.cta_url}
                  className="btn-coral btn-coral-lg inline-flex items-center"
                  {...(b.cta_url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {ctaLabel || "Подробнее"}
                </Link>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "text":
      if (!text.trim()) return null;
      return (
        <div className={`space-y-3 ${alignCls(b.align)}`} style={{ color: "var(--color-ink-soft)", lineHeight: 1.75 }}>
          {text.split(/\n{2,}/).filter(Boolean).map((p, j) => (
            <p key={j} className="text-[16px] md:text-[17px]">{p}</p>
          ))}
        </div>
      );

    case "image":
      return b.bild_url ? (
        <figure className="space-y-2">
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2", background: "var(--color-paper-warm, #E8DFD0)" }}>
            <Image src={b.bild_url} alt={caption} fill sizes="(max-width:768px) 100vw, 900px" className="object-cover" />
          </div>
          {caption && (
            <figcaption className="text-xs" style={{ fontStyle: "italic", color: "var(--color-ink-mute)" }}>
              {caption}
            </figcaption>
          )}
        </figure>
      ) : null;

    case "button":
      return b.cta_url ? (
        <div className={alignCls(b.align ?? "center")}>
          <Link
            href={b.cta_url}
            className="btn-coral btn-coral-lg inline-flex items-center"
            {...(b.cta_url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {ctaLabel || "Подробнее"}
          </Link>
        </div>
      ) : null;

    case "divider":
      return (
        <div className="flex items-center gap-3 py-1" aria-hidden>
          <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
          <span style={{ fontSize: 9, color: "rgba(201,168,76,0.7)" }}>◆</span>
          <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
        </div>
      );

    case "gallery": {
      const imgs = (b.bild_urls ?? []).filter(Boolean);
      if (imgs.length === 0) return null;
      const cols = imgs.length === 1 ? "grid-cols-1" : imgs.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
      return (
        <div className={`grid ${cols} gap-2`}>
          {imgs.map((url, j) => (
            <div key={j} className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1", background: "var(--color-paper-warm, #E8DFD0)" }}>
              <Image src={url} alt="" fill sizes="(max-width:768px) 50vw, 300px" className="object-cover" />
            </div>
          ))}
        </div>
      );
    }

    case "video": {
      const v = b.video_url ? videoEmbed(b.video_url) : null;
      if (!v) return null;
      return (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
          {v.kind === "iframe" ? (
            <iframe
              src={v.src}
              className="absolute inset-0 w-full h-full"
              style={{ border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Видео"
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={v.src} controls className="absolute inset-0 w-full h-full object-contain" />
          )}
        </div>
      );
    }

    case "testimonial":
      if (!quote.trim()) return null;
      return (
        <blockquote className="pl-5 py-2 mx-auto max-w-2xl" style={{ borderLeft: "3px solid var(--color-coral)" }}>
          <Quote className="w-5 h-5 mb-2" style={{ color: "var(--color-coral)" }} />
          <p style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", fontSize: 20, color: "var(--color-ink)", lineHeight: 1.5 }}>
            {quote}
          </p>
          {autor && (
            <cite className="block mt-3 text-sm not-italic" style={{ color: "var(--color-ink-mute)" }}>
              — {autor}
            </cite>
          )}
        </blockquote>
      );

    case "faq": {
      const frage = blockText(b.frage, locale);
      const antwort = blockText(b.antwort, locale);
      if (!frage.trim()) return null;
      return (
        <details
          className="group border border-[var(--color-line)] bg-white"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <summary
            className="cursor-pointer list-none px-4 py-3 flex items-center justify-between font-serif text-[var(--color-ink)]"
            style={{ fontSize: 17 }}
          >
            <span>{frage}</span>
            <span className="text-[var(--color-coral)] transition-transform group-open:rotate-45 text-xl leading-none">+</span>
          </summary>
          {antwort && (
            <div className="px-4 pb-4 pt-1 space-y-2" style={{ color: "var(--color-ink-soft)", lineHeight: 1.7 }}>
              {antwort.split(/\n{2,}/).filter(Boolean).map((p, j) => (
                <p key={j} className="text-[15px]">{p}</p>
              ))}
            </div>
          )}
        </details>
      );
    }

    case "cta_band":
      return (
        <div
          className={`px-6 py-12 md:py-16 ${alignCls(b.align ?? "center")}`}
          style={{ background: "var(--color-coral, #E8703A)", color: "#fff" }}
        >
          <div className="max-w-3xl mx-auto">
            {titel && (
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 4vw, 2.5rem)", lineHeight: 1.1 }}>
                {titel}
              </h2>
            )}
            {subtitel && <p className="mt-3 text-lg" style={{ color: "rgba(255,255,255,0.92)" }}>{subtitel}</p>}
            {b.cta_url && (
              <div className="mt-6">
                <Link
                  href={b.cta_url}
                  className="inline-flex items-center px-7 py-3 font-medium text-sm uppercase tracking-widest transition-colors hover:opacity-90"
                  style={{ background: "#fff", color: "var(--color-cobalt, #1B2566)", borderRadius: "var(--radius-button, 4px)" }}
                  {...(b.cta_url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {ctaLabel || "Подробнее"}
                </Link>
              </div>
            )}
          </div>
        </div>
      );

    case "product_grid": {
      const produkte = await ladeProductGrid(b);
      if (produkte.length === 0) return null;
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {produkte.map((p) => (
            <ProduktKarte key={p.id} produkt={p} />
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}

/** Lädt Produkte für den product_grid-Block (Quelle-abhängig). */
async function ladeProductGrid(b: LandingBlock): Promise<ProduktListItem[]> {
  const limit = Math.min(24, Math.max(1, b.limit ?? 8));
  try {
    if (b.quelle === "slugs") {
      return (await landingProdukteBySlugs(b.produkt_slugs ?? [])).slice(0, limit);
    }
    if (b.quelle === "kategorie" && b.kategorie_slug) {
      const r = await katalogProdukte({ kategorie: b.kategorie_slug, limit });
      return r.items;
    }
    // Default: featured
    return await featuredProdukte(limit);
  } catch {
    return [];
  }
}
