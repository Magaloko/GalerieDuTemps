"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Image as ImageIcon } from "lucide-react";
import type { Produktbild } from "@/types/produkt";

interface Props {
  bilder:       Produktbild[];
  produktName:  string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ImageGallery v2 — Side-by-side Slider + Lightbox
 *
 * Layout (inspired by reference vintage-market):
 *  - 1 Bild         → 100% Breite
 *  - 2 Bilder       → je 50% nebeneinander
 *  - 3+ Bilder      → horizontal scrollbar mit snap, Pfeile, Thumbs unten
 *
 * Features:
 *  - Tap/Click auf Bild → Lightbox
 *  - Keyboard: ESC schließt, ← → navigiert
 *  - Mobile-Swipe via snap-x (native scroll-snap)
 *  - Counter "1 / 5" overlay
 *  - Zoom-Hint Icon (Desktop, fade-in on hover)
 *  - Thumbnail-Strip unter Slider
 * ────────────────────────────────────────────────────────────────────────── */

/* Ruhiger Inline-Platzhalter (paper-warm + dezentes Foto-Icon), der bei
   Ladefehlern eingesetzt wird — statt des Broken-Image-Icons des Browsers.
   Inline-SVG als data-URI: kein Netzwerk-Request, layout-erhaltend (das
   <img> bleibt ein <img> und behält seine Dimensionen). Relevant, weil ein
   fehlendes Persistent Volume in Prod alle Upload-URLs ins Leere zeigen lässt
   (siehe AGENTS.md → Coolify-Volume). */
const FALLBACK_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">` +
      `<rect width="800" height="1000" fill="#E8DFD0"/>` +
      `<g transform="translate(400 470)" fill="none" stroke="#B0A595" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">` +
        `<rect x="-95" y="-72" width="190" height="144" rx="14"/>` +
        `<circle cx="-38" cy="-18" r="20"/>` +
        `<path d="M-95 46 L-18 -16 L46 40 L78 14 L95 30"/>` +
      `</g>` +
      `<text x="400" y="612" font-family="Georgia,'Times New Roman',serif" font-size="31" fill="#B0A595" text-anchor="middle" opacity="0.72">Фото недоступно</text>` +
    `</svg>`,
  );

/** Galerie-Bild mit robustem Lade-Fallback. Deckt beide Fehlerwege ab:
 *   1. Laufzeit-Fehler nach der Hydration                → `onError`.
 *   2. SSR-Bild schlägt VOR der Hydration fehl (React hat den onError-Handler
 *      dann noch nicht gebunden, das error-Event geht verloren) → Mount-Check
 *      per ref (`complete && naturalWidth === 0`).
 *  Bei `src`-Wechsel (Lightbox-Navigation) wird der Fallback zurückgesetzt. */
function GalleryImg({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && !img.src.startsWith("data:")) {
      setFailed(true);
    } else {
      setFailed(false);
    }
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={failed ? FALLBACK_SVG : (src ?? FALLBACK_SVG)}
      alt={alt}
      {...rest}
      onError={() => setFailed(true)}
    />
  );
}

export function ImageGallery({ bilder, produktName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (idx: number) => setActiveIdx(Math.max(0, Math.min(idx, bilder.length - 1))),
    [bilder.length],
  );
  const goPrev = useCallback(() => goTo(activeIdx - 1), [goTo, activeIdx]);
  const goNext = useCallback(() => goTo(activeIdx + 1), [goTo, activeIdx]);

  // Scroll slider zum aktiven Bild
  useEffect(() => {
    const container = sliderRef.current;
    if (!container) return;
    const el = container.children[activeIdx] as HTMLElement | undefined;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeIdx]);

  if (bilder.length === 0) {
    return (
      <div
        className="aspect-[16/9] md:aspect-[2/1] flex items-center justify-center"
        style={{ background: "var(--color-paper-warm, #E8DFD0)" }}
      >
        <div className="flex flex-col items-center gap-2 opacity-60">
          <ImageIcon className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
          <span className="font-sans text-xs uppercase tracking-widest" style={{ color: "var(--color-ink-mute)" }}>
            Нет фото
          </span>
        </div>
      </div>
    );
  }

  const hasMultiple = bilder.length > 1;
  const isFirst     = activeIdx === 0;
  const isLast      = activeIdx === bilder.length - 1;

  // Per-Bild Breite je nach Anzahl
  const itemWidth =
    bilder.length === 1 ? "100%"
    : bilder.length === 2 ? "50%"
    : "auto";

  return (
    <div>
      {/* Main Slider — Aspect-Ratio Container reservierts Layout-Space
          (verhindert CLS beim Bild-Load). Inner-Slider hat absolute Höhe. */}
      <div
        className="relative group w-full"
        style={{ minHeight: "clamp(260px, 45vw, 540px)" }}
      >
        <div
          ref={sliderRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollBehavior: "smooth",
            gap:            "2px",
            height:         "clamp(260px, 45vw, 540px)",
            scrollbarWidth: "none",
          }}
        >
          {bilder.map((bild, idx) => (
            <div
              key={bild.id || idx}
              className="snap-center flex-shrink-0 cursor-zoom-in h-full"
              style={{ width: itemWidth }}
              onPointerDown={(e) => { pointerStart.current = { x: e.clientX, y: e.clientY }; }}
              onPointerUp={(e) => {
                const s = pointerStart.current;
                if (s && Math.abs(e.clientX - s.x) < 8 && Math.abs(e.clientY - s.y) < 8) {
                  setActiveIdx(idx);
                  setLightboxOpen(true);
                }
                pointerStart.current = null;
              }}
            >
              <GalleryImg
                src={bild.url_medium ?? bild.url}
                alt={bild.alt_text ?? `${produktName} — фото ${idx + 1}`}
                className="h-full w-auto max-w-none object-cover transition-transform duration-500 hover:scale-[1.02]"
                style={bilder.length <= 2 ? { width: "100%" } : undefined}
                loading={idx > 2 ? "lazy" : "eager"}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Nav-Pfeile — nur wenn mehrere Bilder */}
        {hasMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              disabled={isFirst}
              className="absolute left-0 top-0 bottom-0 w-12 md:w-14 flex items-center justify-center transition-all bg-gradient-to-r from-black/20 to-transparent md:from-black/10 opacity-70 hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Назад"
            >
              <ChevronLeft size={28} className="text-white drop-shadow-md" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              disabled={isLast}
              className="absolute right-0 top-0 bottom-0 w-12 md:w-14 flex items-center justify-center transition-all bg-gradient-to-l from-black/20 to-transparent md:from-black/10 opacity-70 hover:opacity-100 disabled:opacity-0 disabled:pointer-events-none"
              aria-label="Вперёд"
            >
              <ChevronRight size={28} className="text-white drop-shadow-md" />
            </button>
          </>
        )}

        {/* Counter "1 / 5" */}
        {hasMultiple && (
          <div
            className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full font-sans text-xs text-white/90 pointer-events-none"
            style={{ background: "rgba(15,20,48,0.55)", backdropFilter: "blur(4px)" }}
          >
            {activeIdx + 1} / {bilder.length}
          </div>
        )}

        {/* Zoom-Hint Icon (Desktop only) */}
        <div
          className="absolute bottom-3 left-3 p-2 rounded-full opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none hidden md:block"
          style={{ background: "rgba(15,20,48,0.5)" }}
        >
          <ZoomIn size={14} className="text-white" />
        </div>
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {bilder.map((bild, idx) => {
            const isActive = idx === activeIdx;
            return (
              <button
                key={bild.id || idx}
                onClick={() => setActiveIdx(idx)}
                className="flex-shrink-0 overflow-hidden transition-all duration-200"
                style={{
                  width:   60,
                  height:  60,
                  border:  isActive ? "2px solid var(--color-coral)" : "2px solid transparent",
                  opacity: isActive ? 1 : 0.55,
                }}
                aria-label={`Фото ${idx + 1}`}
              >
                <GalleryImg
                  src={bild.url_thumb ?? bild.url_medium ?? bild.url}
                  alt={bild.alt_text ?? `Миниатюра ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          bilder={bilder}
          activeIdx={activeIdx}
          produktName={produktName}
          onClose={() => setLightboxOpen(false)}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={setActiveIdx}
          isFirst={isFirst}
          isLast={isLast}
        />
      )}
    </div>
  );
}

/* ── Lightbox ─────────────────────────────────────────────────────────── */

function Lightbox({
  bilder,
  activeIdx,
  produktName,
  onClose,
  onPrev,
  onNext,
  onSelect,
  isFirst,
  isLast,
}: {
  bilder:      Produktbild[];
  activeIdx:   number;
  produktName: string;
  onClose:     () => void;
  onPrev:      () => void;
  onNext:      () => void;
  onSelect:    (idx: number) => void;
  isFirst:     boolean;
  isLast:      boolean;
}) {
  const current = bilder[activeIdx] || bilder[0];
  const hasMultiple = bilder.length > 1;

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")    onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight")onNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 text-white/70 hover:text-white transition-colors z-10"
        aria-label="Закрыть"
      >
        <X size={24} />
      </button>

      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-sans text-sm text-white/60">
          {activeIdx + 1} / {bilder.length}
        </div>
      )}

      <GalleryImg
        src={current.url_large ?? current.url}
        alt={current.alt_text ?? produktName}
        className="max-w-[92vw] max-h-[85vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {hasMultiple && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            disabled={isFirst}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/60 hover:text-white transition-colors disabled:opacity-20"
            aria-label="Назад"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            disabled={isLast}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/60 hover:text-white transition-colors disabled:opacity-20"
            aria-label="Вперёд"
          >
            <ChevronRight size={32} />
          </button>

          {/* Thumbnail-Strip am unteren Rand */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[92vw] overflow-x-auto px-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {bilder.map((bild, idx) => (
              <button
                key={bild.id || idx}
                onClick={(e) => { e.stopPropagation(); onSelect(idx); }}
                className={`flex-shrink-0 overflow-hidden transition-all rounded ${
                  idx === activeIdx ? "ring-2 ring-white opacity-100" : "opacity-40 hover:opacity-70"
                }`}
                style={{ width: 44, height: 44 }}
              >
                <GalleryImg
                  src={bild.url_thumb ?? bild.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
