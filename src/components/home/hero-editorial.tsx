'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface HeroEditorialProps {
  /** URL des Hintergrund-Assets (Bild oder Video) */
  backgroundUrl:     string;
  /** Optional: Poster für Video (wird vor dem Video-Load angezeigt) */
  backgroundPoster?: string;
  /** Oberer Eyebrow-Text (uppercase, klein) */
  kicker?:           string;
  /** Erste Zeile des Titels (große Serif) */
  title?:            string;
  /** Zweite Zeile, kursiv + akzent-farbig */
  titleAccent?:      string;
  /** Subtitle unter dem Titel (italic body) */
  subtitle?:         string;
  /** Primärer CTA-Text */
  ctaPrimaryLabel?:  string;
  /** Primärer CTA-Link */
  ctaPrimaryHref?:   string;
  /** Sekundärer CTA-Text (optional) */
  ctaSecondaryLabel?: string;
  /** Sekundärer CTA-Link (optional) */
  ctaSecondaryHref?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * HeroEditorial — ruhiger Editorial-Hero mit Hintergrund-Bild oder -Video.
 *
 * Designprinzipien:
 *  - Ein Hintergrund-Asset, voller Viewport
 *  - Subtiler Dunkel-Gradient (von unten) für Text-Legibility ohne das
 *    Bild zu "ersticken"
 *  - Zentrierter Text-Block: Eyebrow + 2-Zeilen-Headline + Subtitle + 2 CTAs
 *  - Sanfter Fade-Up bei Mount (kein scroll-driven JS, kein Pin)
 *  - Scroll-Indicator unten
 *  - Video läuft autoplay/muted/loop/playsinline (Mobile-kompatibel)
 *  - Bild via next/image mit priority (LCP-Optimierung)
 *
 * Format-Detection: Datei-Endung. mp4/webm/mov → Video. Sonst Bild.
 * ────────────────────────────────────────────────────────────────────────── */

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
}

export function HeroEditorial({
  backgroundUrl,
  backgroundPoster,
  kicker            = 'Кураторский винтаж с 2015',
  title             = 'Редкие вещи',
  titleAccent       = 'с историей.',
  subtitle          = 'Кураторская подборка винтажа — мебель, керамика, графика, текстиль. Каждый предмет проходит атрибуцию и реставрацию.',
  ctaPrimaryLabel   = 'Открыть каталог',
  ctaPrimaryHref    = '/katalog',
  ctaSecondaryLabel,
  ctaSecondaryHref,
}: HeroEditorialProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  // Sanfter Fade-Up bei Mount — purer CSS-Trick, keine GSAP-Abhängigkeit.
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const showVideo = isVideo(backgroundUrl);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen min-h-[560px] overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-ink, #1a1a1a)' }}
    >
      {/* ── Hintergrund: Bild oder Video ──────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {showVideo ? (
          <video
            // eslint-disable-next-line jsx-a11y/media-has-caption
            autoPlay
            muted
            loop
            playsInline
            poster={backgroundPoster || undefined}
            className="w-full h-full object-cover"
            preload="metadata"
          >
            <source src={backgroundUrl} type={`video/${backgroundUrl.split('.').pop()?.replace(/[?#].*$/, '')}`} />
          </video>
        ) : (
          <Image
            src={backgroundUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            // Kleine Ken-Burns-Animation: 6% Zoom-In über 18s, dann pendelt
            style={{
              animation: 'hero-ken-burns 18s ease-in-out infinite alternate',
            }}
          />
        )}
      </div>

      {/* ── Dunkel-Gradient für Text-Legibility ──────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(15,20,48,0.30) 0%, rgba(15,20,48,0.15) 35%, rgba(15,20,48,0.55) 75%, rgba(15,20,48,0.78) 100%)',
        }}
      />

      {/* Side-Vignetten (subtle, nur an den Rändern) */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)',
        }}
      />

      {/* ── Text-Overlay ────────────────────────────────────────────────── */}
      <div
        className="relative z-20 flex flex-col items-center text-center px-6 max-w-3xl mx-auto"
        style={{
          opacity:    mounted ? 1 : 0,
          transform:  mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1), transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
          textShadow: '0 2px 24px rgba(15,20,48,0.55)',
        }}
      >
        <p
          className="text-[11px] uppercase font-medium mb-7 md:mb-9"
          style={{
            letterSpacing: '0.28em',
            color:         'var(--color-coral)',
          }}
        >
          {kicker}
        </p>

        <h1
          className="mb-7 md:mb-9"
          style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(3rem, 8vw, 6.5rem)',
            lineHeight:    0.94,
            letterSpacing: '-0.01em',
            color:         'var(--color-vintage-white, #F5F0E8)',
          }}
        >
          {title}
          <br />
          <em
            style={{
              color:     'var(--color-coral)',
              fontStyle: 'italic',
            }}
          >
            {titleAccent}
          </em>
        </h1>

        <p
          className="max-w-xl mb-10 md:mb-12 text-[15px] md:text-base leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.82)' }}
        >
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={ctaPrimaryHref}
            className="inline-flex items-center gap-2 text-[11px] uppercase font-medium py-3.5 px-9 text-white transition-all duration-300 hover:opacity-90 hover:gap-3"
            style={{
              letterSpacing: '0.18em',
              backgroundColor: 'var(--color-coral)',
            }}
          >
            <span>{ctaPrimaryLabel}</span>
            <ArrowRight className="w-4 h-4 transition-transform" />
          </Link>
          {ctaSecondaryLabel && ctaSecondaryHref && (
            <Link
              href={ctaSecondaryHref}
              className="inline-flex items-center gap-2 text-[11px] uppercase font-medium py-3.5 px-9 transition-all duration-300 hover:bg-white/10"
              style={{
                letterSpacing: '0.18em',
                color:         'rgba(255,255,255,0.85)',
                border:        '1px solid rgba(255,255,255,0.30)',
              }}
            >
              <span>{ctaSecondaryLabel}</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Scroll-Indikator (unten) ─────────────────────────────────────── */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
        style={{
          color:    'rgba(255,255,255,0.55)',
          opacity:  mounted ? 1 : 0,
          transition: 'opacity 1.4s ease-out 0.4s',
        }}
      >
        <span
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: '0.22em' }}
        >
          Листайте вниз
        </span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </div>

      {/* Ken-Burns Keyframes (inline damit kein extra CSS-File nötig) */}
      <style jsx>{`
        @keyframes hero-ken-burns {
          0%   { transform: scale(1) translate(0, 0);     }
          100% { transform: scale(1.06) translate(-1%, -1%); }
        }
      `}</style>
    </section>
  );
}
