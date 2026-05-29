"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Heart, Menu, X, User } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { CartBadge } from "./cart-badge";
import { MobileDrawer } from "./mobile-drawer";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/types";
import type { Kategorie } from "@/types/produkt";

type HeaderProps = {
  t:               Dictionary;
  locale:          Locale;
  kategorien?:     Kategorie[];
  promo?:          { links: string; rechts: string };
  /** Wohin der User-Icon-Link führt. Server-seitig aus Session abgeleitet. */
  userHref?:       string;
  /** True wenn eine Session existiert — bestimmt Tooltip/Icon-Tönung. */
  userEingeloggt?: boolean;
  /** Schaufenster-Modus: false → kein Warenkorb-Icon im Header. Default true. */
  kaufenAktiv?:    boolean;
};

/* ──────────────────────────────────────────────────────────────────────────
 * Header — Handoff D1 (Cobalt, 3 Bars) + D2 (Paper, sticky) Scroll-Morph.
 *
 * D1: Promo-Bar (cobalt-dark) → Main-Bar (cobalt, stacked Hourglass+Wordmark
 *     Lockup zentriert) → Sub-Bar (cobalt-deep) mit Category-Chips.
 *
 * D2: Beim Scrollen unter ~640px (Hero-Höhe) morph zu kompaktem Paper-Header,
 *     einer Bar, ink-Text, kleineres Wordmark, Coral-CTA.
 *
 * Mobile: Single 56px Bar (cobalt) — Hamburger links, Wordmark Mitte, Such-
 *     Icon rechts. Bottom-Tab-Bar separat (siehe mobile-tab-bar.tsx).
 * ────────────────────────────────────────────────────────────────────────── */
export function Header({
  t, locale, kategorien = [], promo,
  userHref = "/kunde/anmelden",
  userEingeloggt = false,
  kaufenAktiv = true,
}: HeaderProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { ids }  = useWunschliste();

  const [scrolled,   setScrolled]   = useState(false);
  const [menuOffen,  setMenuOffen]  = useState(false);
  const [sucheOffen, setSucheOffen] = useState(false);
  const [suchText,   setSuchText]   = useState("");
  const sucheRef = useRef<HTMLInputElement>(null);

  // Scroll-Morph: D1 → D2.
  //
  // Hysterese (zeigen ab 600px, verstecken erst unter 100px) verhindert das
  // Flackern wenn die scroll-position genau am Threshold pendelt — z.B. wenn
  // ein iOS-Rubberband oder das ein/ausblendende sticky-D2 selbst minimal
  // den scrollY-Wert verschiebt.
  //
  // requestAnimationFrame-Throttling stellt sicher dass wir pro Frame nur
  // einmal setState rufen — sonst rendert React beim schnellen Scrollen zig
  // mal pro Sekunde und der Header wirkt zappelig.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(prev => {
          if (!prev && y > 600) return true;
          if (prev  && y < 100) return false;
          return prev;
        });
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOffen(false); setSucheOffen(false); }, [pathname]);
  useEffect(() => { if (sucheOffen) sucheRef.current?.focus(); }, [sucheOffen]);

  const handleSuche = (e: React.FormEvent) => {
    e.preventDefault();
    if (suchText.trim().length >= 2) {
      router.push(`/katalog?suche=${encodeURIComponent(suchText.trim())}`);
      setSucheOffen(false);
      setSuchText("");
    }
  };

  const navLinks = [
    { href: "/katalog",   label: t.nav.katalog },
    { href: "/instagram", label: "Instagram"   },
    { href: "/journal",   label: t.nav.journal },
    { href: "/about",     label: t.nav.about   },
    { href: "/kontakt",   label: t.nav.kontakt },
  ];

  // ── D2 (gescrollt, Paper-Bar) ───────────────────────────────────────────
  //
  // Wichtig: D2 ist `fixed`, NICHT `sticky`. Sticky würde Platz im normalen
  // Flow beanspruchen sobald die Komponente mounted und sofort einen
  // Layout-Shift verursachen — Content darunter würde plötzlich nach unten
  // springen. Fixed overlay-t den content ohne Flow-Eintrag.
  //
  // Slide-In via CSS-Animation animate-gdt-header-down (in globals.css) damit
  // der Mount nicht „aus dem Nichts" erscheint sondern sanft von oben kommt.
  if (scrolled) {
    return (
      <>
        <header
          lang={locale}
          className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b animate-gdt-header-down"
          style={{
            background:   "rgba(245, 241, 234, 0.92)",   /* paper/92 */
            borderColor:  "var(--color-line)",
          }}
        >
          <div className="max-w-[1440px] mx-auto px-5 md:px-14">

            {/* Mobile-Layout: hamburger | wordmark | search.
                Heart/Cart/Account leben in der Bottom-Tab-Bar — nicht hier doppeln. */}
            <div className="flex md:hidden items-center justify-between h-14">
              <button
                onClick={() => setMenuOffen(true)}
                className="p-2 -ml-2 transition-colors hover:text-coral"
                style={{ color: "var(--color-ink)" }}
                aria-label={t.nav.menu}
                aria-expanded={menuOffen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/" className="flex items-baseline gap-2 min-w-0">
                <span className="wordmark" style={{ fontSize: 16, color: "var(--color-ink)" }}>
                  GALERIE
                </span>
                <span className="wordmark-italic" style={{ fontSize: 11, color: "var(--color-ink-soft)" }}>
                  du Temps
                </span>
              </Link>
              <button
                onClick={() => setSucheOffen(v => !v)}
                className="p-2 -mr-2 transition-colors hover:text-coral"
                style={{ color: "var(--color-ink)" }}
                aria-label={t.nav.suche}
              >
                {sucheOffen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            {/* Desktop-Layout: nav | wordmark (absolute center) | actions */}
            <div className="hidden md:flex relative items-center justify-between gap-6 h-14">
              <nav className="flex items-center gap-7">
                {navLinks.map(({ href, label }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="text-[11px] uppercase font-medium transition-colors whitespace-nowrap"
                      style={{
                        letterSpacing: "var(--tracking-nav)",
                        color:         active ? "var(--color-coral)" : "var(--color-ink)",
                        borderBottom:  active ? "1px solid var(--color-coral)" : "1px solid transparent",
                        paddingBottom: "6px",
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-baseline gap-2">
                <span className="wordmark" style={{ fontSize: 18, color: "var(--color-ink)" }}>
                  GALERIE
                </span>
                <span className="wordmark-italic" style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
                  du Temps
                </span>
              </Link>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSucheOffen(v => !v)}
                  className="p-2 transition-colors hover:text-coral"
                  style={{ color: "var(--color-ink)" }}
                  aria-label={t.nav.suche}
                >
                  {sucheOffen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>
                <Link
                  href="/wunschliste"
                  className="relative p-2 transition-colors hover:text-coral"
                  style={{ color: "var(--color-ink)" }}
                  aria-label={`${t.nav.wunschliste} (${ids.length})`}
                >
                  <Heart className="w-4 h-4" />
                  {ids.length > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[10px] font-medium flex items-center justify-center"
                      style={{
                        background:   "var(--color-coral)",
                        color:        "#fff",
                        borderRadius: "999px",
                      }}
                    >
                      {ids.length > 9 ? "9+" : ids.length}
                    </span>
                  )}
                </Link>
                {kaufenAktiv && <CartBadge />}
                <Link
                  href={userHref}
                  className="ml-2 btn-coral btn-coral-sm"
                  aria-label={userEingeloggt ? t.kunde?.mein_konto ?? "Кабинет" : t.nav.anmelden}
                >
                  {userEingeloggt ? (t.kunde?.mein_konto ?? "Кабинет") : t.nav.anmelden}
                </Link>
              </div>
            </div>

            {sucheOffen && <SearchBar inputRef={sucheRef} value={suchText} onChange={setSuchText} onSubmit={handleSuche} placeholder={t.nav.suche_placeholder} tone="paper" />}
          </div>
        </header>
        <MobileDrawer
          open={menuOffen}
          onClose={() => setMenuOffen(false)}
          t={t}
          navLinks={navLinks}
          kategorien={kategorien}
          wunschCount={ids.length}
        />
      </>
    );
  }

  // ── D1 (Top, Cobalt 3-Bar) ──────────────────────────────────────────────
  return (
    <>
      <header lang={locale} className="relative z-50">

        {/* ─ Bar 1: Promo (cobalt-dark) ──────────────────────────────────── */}
        <div
          className="hidden md:block"
          style={{ background: "var(--color-cobalt-dark)" }}
        >
          <div className="max-w-[1440px] mx-auto px-14 py-2 flex items-center justify-center gap-5 text-[10px] uppercase font-medium"
               style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.7)" }}>
            <span>{promo?.links || "◆ Бесплатная доставка по Казахстану от ₸ 50 000"}</span>
            <span aria-hidden style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ color: "var(--color-coral)" }}>
              {promo?.rechts || "Новые поступления каждую среду"}
            </span>
          </div>
        </div>

        {/* ─ Bar 2: Main (cobalt) ────────────────────────────────────────── */}
        <div style={{ background: "var(--color-cobalt)" }}>
          <div className="max-w-[1440px] mx-auto px-5 md:px-14 py-3 md:py-4">
            {/* Mobile: hamburger | wordmark | search */}
            <div className="flex md:hidden items-center justify-between h-9">
              <button
                onClick={() => setMenuOffen(true)}
                className="p-1 text-white/80 hover:text-coral transition-colors"
                aria-label={t.nav.menu}
                aria-expanded={menuOffen}
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <span className="wordmark" style={{ fontSize: 16 }}>GALERIE</span>
                <span className="wordmark-italic" style={{ fontSize: 11 }}>du Temps</span>
              </Link>
              <button
                onClick={() => setSucheOffen(v => !v)}
                className="p-1 text-white/80 hover:text-coral transition-colors"
                aria-label={t.nav.suche}
              >
                {sucheOffen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            {/* Desktop: 3-col (spacer | logo | actions) — Nav ist jetzt in der Sub-Bar */}
            <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-6">
              {/* left spacer (hält das Logo mittig) */}
              <div aria-hidden />

              {/* Emblem-Logo center */}
              <Link
                href="/"
                className="justify-self-center block"
                aria-label="Galerie du Temps — Startseite"
              >
                <Image
                  src="/images/galerie-logo-red.png"
                  alt="Galerie du Temps"
                  width={64}
                  height={64}
                  priority
                  className="block h-14 w-auto"
                />
              </Link>

              {/* Actions right */}
              <div className="flex items-center justify-end gap-2">
                {/* Search input pseudo */}
                <button
                  onClick={() => setSucheOffen(v => !v)}
                  className="flex items-center gap-2 px-1 py-2 text-xs transition-colors hover:text-coral"
                  style={{
                    background:    "transparent",
                    borderBottom:  "1px solid rgba(255,255,255,0.25)",
                    color:         "rgba(255,255,255,0.7)",
                    letterSpacing: "0.04em",
                    minWidth:      180,
                  }}
                  aria-label={t.nav.suche}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="italic font-italic" style={{ opacity: 0.7 }}>
                    {t.nav.suche_placeholder}
                  </span>
                </button>
                <Link
                  href="/wunschliste"
                  className="relative p-2 text-white/80 hover:text-coral transition-colors"
                  aria-label={`${t.nav.wunschliste} (${ids.length})`}
                >
                  <Heart className="w-4 h-4" />
                  {ids.length > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[10px] font-medium flex items-center justify-center"
                      style={{ background: "var(--color-coral)", color: "#fff", borderRadius: "999px" }}
                    >
                      {ids.length > 9 ? "9+" : ids.length}
                    </span>
                  )}
                </Link>
                {kaufenAktiv && <CartBadge />}
                <Link
                  href={userHref}
                  className="ml-1 p-2 transition-colors hover:text-coral"
                  style={{ color: userEingeloggt ? "var(--color-coral)" : "rgba(255,255,255,0.8)" }}
                  aria-label={userEingeloggt ? t.kunde?.mein_konto ?? "Кабинет" : t.nav.anmelden}
                  title={userEingeloggt ? t.kunde?.mein_konto ?? "Кабинет" : t.nav.anmelden}
                >
                  <User className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─ Bar 3: Sub (cobalt) — Haupt-Navigation (zentriert) ───────────── */}
        <div
          className="hidden md:block border-t"
          style={{
            background:  "var(--color-cobalt)",
            borderColor: "rgba(232,112,58,0.15)",
          }}
        >
          <nav className="max-w-[1440px] mx-auto px-14 py-2.5 flex items-center justify-center gap-8">
            {navLinks.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-[11px] uppercase font-medium transition-colors whitespace-nowrap ${active ? "text-coral" : "text-white/85 hover:text-coral"}`}
                  style={{
                    letterSpacing: "var(--tracking-nav)",
                    borderBottom:  active ? "1px solid var(--color-coral)" : "1px solid transparent",
                    paddingBottom: "4px",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ─ Such-Leiste (ausklappbar) ─────────────────────────────────── */}
        {sucheOffen && (
          <div style={{ background: "var(--color-cobalt)" }}>
            <div className="max-w-[1440px] mx-auto px-5 md:px-14 pb-4">
              <SearchBar
                inputRef={sucheRef}
                value={suchText}
                onChange={setSuchText}
                onSubmit={handleSuche}
                placeholder={t.nav.suche_placeholder}
                tone="cobalt"
              />
            </div>
          </div>
        )}
      </header>

      <MobileDrawer
        open={menuOffen}
        onClose={() => setMenuOffen(false)}
        t={t}
        navLinks={navLinks}
        kategorien={kategorien}
        wunschCount={ids.length}
      />
    </>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function SearchBar({
  inputRef, value, onChange, onSubmit, placeholder, tone,
}: {
  inputRef:    React.RefObject<HTMLInputElement | null>;
  value:       string;
  onChange:    (v: string) => void;
  onSubmit:    (e: React.FormEvent) => void;
  placeholder: string;
  tone:        "cobalt" | "paper";
}) {
  const isCobalt = tone === "cobalt";
  return (
    <form onSubmit={onSubmit} className="relative max-w-xl mx-auto pt-2">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: "var(--color-coral)" }}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-3 text-sm focus:outline-none transition-colors"
        style={{
          background:  isCobalt ? "rgba(255,255,255,0.06)" : "#fff",
          border:      `1px solid ${isCobalt ? "rgba(255,255,255,0.18)" : "var(--color-line)"}`,
          color:       isCobalt ? "var(--color-vintage-white)" : "var(--color-ink)",
          fontFamily:  "var(--font-italic)",
          fontStyle:   "italic",
        }}
      />
    </form>
  );
}

