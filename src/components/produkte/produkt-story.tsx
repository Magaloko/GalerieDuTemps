import Image from "next/image";
import Link from "next/link";
import { Quote } from "lucide-react";
import type { ProduktBlock } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktStory — rendert die block-basierte Produktbeschreibung (editorial).
 *
 * Server-Component. React escaped Text automatisch (kein dangerouslySetInnerHTML).
 * Bewusst schlicht & markenkonform (Galerie-Optik), nicht generisch.
 * ────────────────────────────────────────────────────────────────────────── */
export function ProduktStory({ blocks }: { blocks: ProduktBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((b, i) => {
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
                {b.text}
              </h2>
            );

          case "text":
            return (
              <div key={i} className="space-y-3" style={{ color: "var(--color-ink-soft)", lineHeight: 1.7 }}>
                {(b.text ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => (
                  <p key={j} className="text-[15px]">{p}</p>
                ))}
              </div>
            );

          case "image":
            return b.bild_url ? (
              <figure key={i} className="space-y-2">
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/2", background: "var(--color-paper-warm, #E8DFD0)" }}>
                  <Image src={b.bild_url} alt={b.caption ?? ""} fill sizes="(max-width:768px) 100vw, 700px" className="object-cover" />
                </div>
                {b.caption && (
                  <figcaption className="text-xs" style={{ fontStyle: "italic", color: "var(--color-ink-mute)" }}>
                    {b.caption}
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
                {b.text}
              </div>
            );

          case "quote":
            return (
              <blockquote key={i} className="pl-4 py-1" style={{ borderLeft: "2px solid var(--color-coral)" }}>
                <Quote className="w-4 h-4 mb-1" style={{ color: "var(--color-coral)" }} />
                <p style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", fontSize: 18, color: "var(--color-ink)", lineHeight: 1.5 }}>
                  {b.text}
                </p>
                {b.caption && (
                  <cite className="block mt-2 text-xs not-italic" style={{ color: "var(--color-ink-mute)" }}>
                    — {b.caption}
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
                  {(b.text ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
                </div>
                <div className="space-y-3">
                  {(b.text2 ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
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
                  {b.label || "Подробнее"}
                </Link>
              </div>
            ) : null;

          default:
            return null;
        }
      })}
    </div>
  );
}
