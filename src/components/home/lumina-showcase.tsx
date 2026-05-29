"use client";

import { LuminaInteractiveSlider } from "@/components/ui/lumina-interactive-slider";

/* ──────────────────────────────────────────────────────────────────────────
 * LuminaShowcase — WebGL-Slider-Sektion (Komponente portiert aus Amina V3).
 *
 * Nur für die WEB-Startseite gedacht (nicht Telegram-WebView — zu schwer).
 * Die Slider-Komponente lädt GSAP + THREE.js selbst dynamisch vom CDN
 * (mit Guards/Timeout). Rendert nichts, wenn keine Slides mit Bild da sind.
 * ────────────────────────────────────────────────────────────────────────── */
export function LuminaShowcase({
  slides,
}: {
  slides: { title: string; description: string; media: string }[];
}) {
  if (slides.length === 0) return null;

  return (
    <section className="px-4 py-12 md:py-20" style={{ background: "var(--color-ink, #0F1430)" }}>
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 text-center">
          <p className="text-[11px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.3em", color: "var(--color-gold, #C9A84C)" }}>
            ✦ Избранное
          </p>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, lineHeight: 1.05, color: "#fff" }}>
            В движении
          </h2>
        </header>
        <LuminaInteractiveSlider slides={slides} effect="glass" autoSlideSpeed={6000} />
      </div>
    </section>
  );
}
