import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";
import type { ProduktBlock } from "@/types/produkt";
import { storyBgCss } from "./story-bg";
import { blockText } from "@/lib/utils/i18n-text";
import type { Locale } from "@/i18n/types";

/** Video-URL → Embed (YouTube/Vimeo iframe oder natives <video>). */
function videoEmbed(url: string): { kind: "iframe" | "video"; src: string } | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktStory — rendert die block-basierte Produktbeschreibung (editorial).
 *
 * Server-Component. React escaped Text automatisch (kein dangerouslySetInnerHTML).
 * Bewusst schlicht & markenkonform (Galerie-Optik), nicht generisch.
 * ────────────────────────────────────────────────────────────────────────── */
export function ProduktStory({ blocks, locale }: { blocks: ProduktBlock[]; locale: Locale }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
        const t   = blockText(b.text,   locale);
        const t2  = blockText(b.text2,  locale);
        const cap = blockText(b.caption, locale);
        const lbl = blockText(b.label,  locale);
        const inner = (() => {
        switch (b.type) {
          case "heading":
            return (
              <h2
                key={i}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   "clamp(1.4rem, 3vw, 1.9rem)",
                  color:      "var(--color-ink)",
                  lineHeight: 1.15,
                }}
              >
                {t}
              </h2>
            );

          case "text":
            return (
              <div key={i} className="space-y-3" style={{ color: "var(--color-ink-soft)", lineHeight: 1.7 }}>
                {t.split(/\n{2,}/).filter(Boolean).map((p, j) => (
                  <p key={j} className="text-[15px]">{p}</p>
                ))}
              </div>
            );

          case "image":
            return b.bild_url ? (
              <figure key={i} className="space-y-2">
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2", background: "var(--color-paper-warm, #E8DFD0)" }}>
                  <Image src={b.bild_url} alt={cap} fill sizes="(max-width:768px) 100vw, 700px" className="object-cover" />
                </div>
                {cap && (
                  <figcaption className="text-xs" style={{ fontStyle: "italic", color: "var(--color-ink-mute)" }}>
                    {cap}
                  </figcaption>
                )}
              </figure>
            ) : null;

          case "highlight":
            return (
              <div
                key={i}
                className="p-4"
                style={{
                  background: "rgba(201,168,76,0.10)",
                  borderLeft: "3px solid var(--color-gold, #C9A84C)",
                  color:      "var(--color-ink)",
                  lineHeight: 1.6,
                }}
              >
                {t}
              </div>
            );

          case "quote":
            return (
              <blockquote key={i} className="pl-4 py-1" style={{ borderLeft: "2px solid var(--color-coral)" }}>
                <Quote className="w-4 h-4 mb-1" style={{ color: "var(--color-coral)" }} />
                <p style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", fontSize: 18, color: "var(--color-ink)", lineHeight: 1.5 }}>
                  {t}
                </p>
                {cap && (
                  <cite className="block mt-2 text-xs not-italic" style={{ color: "var(--color-ink-mute)" }}>
                    — {cap}
                  </cite>
                )}
              </blockquote>
            );

          case "divider":
            return (
              <div key={i} className="flex items-center gap-3 py-2" aria-hidden>
                <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
                <span style={{ fontSize: 9, color: "rgba(201,168,76,0.7)" }}>◆</span>
                <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
              </div>
            );

          case "columns":
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[15px]" style={{ color: "var(--color-ink-soft)", lineHeight: 1.7 }}>
                <div className="space-y-3">
                  {t.split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
                </div>
                <div className="space-y-3">
                  {t2.split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
                </div>
              </div>
            );

          case "gallery": {
            const imgs = (b.bilder ?? []).filter(Boolean);
            if (imgs.length === 0) return null;
            const cols = imgs.length === 1 ? "grid-cols-1" : imgs.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
            return (
              <div key={i} className={`grid ${cols} gap-2`}>
                {imgs.map((url, j) => (
                  <div key={j} className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1", background: "var(--color-paper-warm, #E8DFD0)" }}>
                    <Image src={url} alt="" fill sizes="(max-width:768px) 50vw, 240px" className="object-cover" />
                  </div>
                ))}
              </div>
            );
          }

          case "button":
            return b.url ? (
              <div key={i} className="py-1">
                <Link
                  href={b.url}
                  className="btn-coral btn-coral-lg inline-flex items-center"
                  {...(b.url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {lbl || "Подробнее"}
                </Link>
              </div>
            ) : null;

          case "video": {
            const v = b.url ? videoEmbed(b.url) : null;
            if (!v) return null;
            return (
              <div key={i} className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9", background: "#000" }}>
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

          default:
            return null;
        }
        })();
        if (!inner) return null;
        const bg = storyBgCss(b.bg);
        return bg
          ? <div key={i} style={{ background: bg, padding: "1.25rem 1.5rem", borderRadius: "var(--radius-card)" }}>{inner}</div>
          : <div key={i}>{inner}</div>;
      })}
    </div>
  );
}
