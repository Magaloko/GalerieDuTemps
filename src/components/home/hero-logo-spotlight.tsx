"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * HeroLogoSpotlight — „Taschenlampen"-Reveal zwischen zwei Logo-Farbwelten.
 *
 * Basis-Ebene: cobalt/coral-Emblem (galerie-logo.png).
 * Reveal-Ebene: rotes Emblem (galerie-logo-red.png), nur in einem kreisrunden,
 * weich auslaufenden Lichtkegel sichtbar, der dem Zeiger folgt. Ohne Zeiger
 * (Touch/Idle) umkreist der Lichtkegel sanft die Mitte. `prefers-reduced-motion`
 * → statischer, zentrierter Kegel.
 *
 * Beide Ebenen sind `background-image` (kein <img>): fehlt galerie-logo-red.png,
 * bleibt die Reveal-Ebene transparent → der Hero zeigt sauber nur das cobalt-
 * Logo (kein kaputtes Bild). Sobald die Datei da ist, lebt der Effekt.
 * ────────────────────────────────────────────────────────────────────────── */

interface Props {
  eyebrow?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryHref?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
  baseSrc?: string;
  revealSrc?: string;
}

export function HeroLogoSpotlight({
  eyebrow            = "Винтаж с историей. Изящество вне времени.",
  ctaPrimaryLabel    = "Открыть каталог",
  ctaPrimaryHref     = "/katalog",
  ctaSecondaryLabel,
  ctaSecondaryHref   = "/assistent",
  baseSrc            = "/images/galerie-logo.png",
  revealSrc          = "/images/galerie-logo-red.png",
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const set = (x: number, y: number) => {
      stage.style.setProperty("--mx", `${x}px`);
      stage.style.setProperty("--my", `${y}px`);
    };
    const recenter = () => {
      const r = stage.getBoundingClientRect();
      set(r.width / 2, r.height / 2);
    };
    recenter();

    let pointerActive = false;
    const onPointer = (e: PointerEvent) => {
      pointerActive = true;
      const r = stage.getBoundingClientRect();
      set(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => { pointerActive = false; };

    stage.addEventListener("pointermove", onPointer);
    stage.addEventListener("pointerleave", onLeave);

    // Idle-/Touch-Auto-Orbit: Lissajous-Bahn um die Mitte.
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (!pointerActive) {
        const r = stage.getBoundingClientRect();
        const t = (now - start) / 1000;
        set(
          r.width / 2  + Math.cos(t * 0.55) * r.width  * 0.20,
          r.height / 2 + Math.sin(t * 0.83) * r.height * 0.20,
        );
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduce) raf = requestAnimationFrame(tick);

    const onResize = () => { if (!pointerActive) recenter(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onPointer);
      stage.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const mask =
    "radial-gradient(circle var(--r, 240px) at var(--mx, 50%) var(--my, 50%), #000 0%, #000 60%, rgba(0,0,0,0) 100%)";
  const logoLayer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage:    "var(--logo)",
    backgroundSize:     "contain",
    backgroundPosition: "center",
    backgroundRepeat:   "no-repeat",
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: "var(--color-cobalt, #1B2566)", minHeight: "100svh" }}
    >
      {/* Bühne mit Spotlight-Variablen */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        style={{ ["--r" as string]: "clamp(150px, 28vmin, 320px)", touchAction: "none" }}
      >
        {/* Basis: cobalt/coral-Logo */}
        <div style={{ ...logoLayer, ["--logo" as string]: `url(${baseSrc})` }} aria-hidden />

        {/* Reveal: rotes Logo, nur im Lichtkegel */}
        <div
          aria-hidden
          style={{
            ...logoLayer,
            ["--logo" as string]: `url(${revealSrc})`,
            maskImage:       mask,
            WebkitMaskImage: mask,
          }}
        />

        {/* Licht-Bloom (Coral-Schimmer am Kegelrand) */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle calc(var(--r, 240px) * 1.15) at var(--mx, 50%) var(--my, 50%), rgba(232,112,58,0.18) 0%, rgba(232,112,58,0) 70%)",
            mixBlendMode: "screen",
          }}
        />
      </div>

      {/* Vignette oben/unten für Lesbarkeit der Texte */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(14,19,54,0.55) 0%, rgba(14,19,54,0) 28%, rgba(14,19,54,0) 64%, rgba(14,19,54,0.85) 100%)" }}
      />

      {/* Inhalt: Eyebrow oben, CTAs + Hint unten */}
      <div className="relative z-10 flex flex-col min-h-[100svh] px-6 py-10 md:py-14">
        <p
          className="text-center text-[10px] md:text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.3em", color: "var(--color-coral, #E8703A)" }}
        >
          {eyebrow}
        </p>

        <div className="mt-auto flex flex-col items-center gap-5">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={ctaPrimaryHref}
              className="inline-flex items-center gap-2 px-8 py-4 text-[11px] uppercase font-medium transition-colors"
              style={{ letterSpacing: "0.2em", background: "var(--color-coral, #E8703A)", color: "#fff", borderRadius: "var(--radius-button, 2px)" }}
            >
              {ctaPrimaryLabel} <ArrowRight className="w-4 h-4" />
            </Link>
            {ctaSecondaryLabel && (
              <Link
                href={ctaSecondaryHref}
                className="inline-flex items-center gap-2 px-8 py-4 text-[11px] uppercase font-medium transition-colors hover:bg-white/10"
                style={{ letterSpacing: "0.2em", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "var(--radius-button, 2px)" }}
              >
                {ctaSecondaryLabel}
              </Link>
            )}
          </div>

          <p
            className="text-[10px] uppercase"
            style={{ letterSpacing: "0.24em", color: "rgba(255,255,255,0.4)" }}
          >
            ✦ Наведите, чтобы раскрыть
          </p>
        </div>
      </div>
    </section>
  );
}
