"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Heart, Menu, X } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { CartBadge } from "./cart-badge";
import { LanguageSwitcher } from "./language-switcher";
import type { Dictionary } from "@/i18n";
import type { Locale } from "@/i18n/types";

export function Header({ t, locale }: { t: Dictionary; locale: Locale }) {
  const pathname         = usePathname();
  const router           = useRouter();
  const { ids }          = useWunschliste();
  const [menuOffen,  setMenuOffen]  = useState(false);
  const [sucheOffen, setSucheOffen] = useState(false);
  const [suchText,   setSuchText]   = useState("");
  const sucheRef = useRef<HTMLInputElement>(null);

  // Im Vorbild: KATALOG · О НАС · КОНТАКТ (kein "Kategorien" als separater Punkt)
  const NAV_LINKS = [
    { href: "/katalog",  label: t.nav.katalog },
    { href: "/about",    label: t.nav.about   },
    { href: "/kontakt",  label: t.nav.kontakt },
  ];

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

  return (
    <>
      <header
        lang={locale}
        className="
          sticky top-0 z-50
          bg-vintage-espresso/95 backdrop-blur-sm
          border-b border-vintage-sand/30
        "
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex md:grid md:grid-cols-3 items-center justify-between gap-2 h-16 md:h-20">

            {/* ─── Links: Logo ──────────────────────────────────────────── */}
            <div className="flex items-center min-w-0 flex-shrink">
              <Link href="/" className="brand-logo group">
                <span className="brand-line-1 group-hover:text-vintage-gold transition-colors">
                  GALERIE
                </span>
                <span className="brand-line-2">du Temps</span>
              </Link>
            </div>

            {/* ─── Mitte: Nav (Desktop) ──────────────────────────────────── */}
            <nav className="hidden md:flex items-center justify-center gap-10">
              {NAV_LINKS.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      text-xs font-sans tracking-[0.25em] uppercase transition-colors
                      ${active
                        ? "text-vintage-gold"
                        : "text-vintage-cream/70 hover:text-vintage-gold"
                      }
                    `}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* ─── Rechts: Icons ──────────────────────────────────────────── */}
            <div className="flex items-center justify-end gap-0.5 md:gap-1 flex-shrink-0">
              <button
                onClick={() => setSucheOffen(v => !v)}
                className="p-2 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                aria-label={t.nav.suche}
              >
                {sucheOffen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>

              <Link
                href="/wunschliste"
                className="relative p-2 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                aria-label={`${t.nav.wunschliste} (${ids.length})`}
              >
                <Heart className="w-4 h-4" />
                {ids.length > 0 && (
                  <span
                    className="
                      absolute -top-0.5 -right-0.5
                      min-w-4 h-4 px-1
                      bg-vintage-gold text-vintage-espresso
                      text-[10px] font-sans font-semibold
                      flex items-center justify-center
                    "
                    style={{ borderRadius: "999px" }}
                  >
                    {ids.length > 9 ? "9+" : ids.length}
                  </span>
                )}
              </Link>

              <LanguageSwitcher ariaLabel={t.nav.sprache} />

              <CartBadge />

              {/* Login-Pill (wie im Vorbild) */}
              <Link
                href="/kunde/anmelden"
                className="
                  hidden sm:inline-flex items-center gap-1.5 ml-2
                  px-4 py-2
                  border border-vintage-gold/40
                  text-vintage-gold text-xs font-sans tracking-widest uppercase
                  hover:bg-vintage-gold hover:text-vintage-espresso
                  transition-colors
                "
                style={{ borderRadius: "999px" }}
              >
                {t.nav.anmelden}
              </Link>

              {/* Mobile Menü-Button */}
              <button
                onClick={() => setMenuOffen(v => !v)}
                className="md:hidden p-2 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                aria-label={t.nav.menu}
              >
                {menuOffen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* ─── Such-Leiste (ausklappbar) ──────────────────────────────── */}
          {sucheOffen && (
            <div className="pb-4">
              <form onSubmit={handleSuche} className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-gold pointer-events-none" />
                <input
                  ref={sucheRef}
                  type="search"
                  value={suchText}
                  onChange={e => setSuchText(e.target.value)}
                  placeholder={t.nav.suche_placeholder}
                  className="
                    w-full pl-11 pr-4 py-3
                    bg-vintage-brown border border-vintage-sand
                    text-vintage-cream font-sans text-sm
                    placeholder:text-vintage-dust
                    focus:outline-none focus:border-vintage-gold
                    transition-colors
                  "
                  style={{ borderRadius: "var(--radius-card)" }}
                />
              </form>
            </div>
          )}
        </div>
      </header>

      {/* ─── Mobile Nav Overlay ────────────────────────────────────────── */}
      {menuOffen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-vintage-ink/80 backdrop-blur-sm"
            onClick={() => setMenuOffen(false)}
          />
          <nav
            className="absolute right-0 top-0 bottom-0 w-72 bg-vintage-espresso flex flex-col pt-24 px-6 pb-6 border-l border-vintage-sand/30"
          >
            <p className="eyebrow mb-6">{t.nav.menu}</p>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`
                  py-3 border-b border-vintage-sand/20
                  font-serif text-xl transition-colors
                  ${pathname.startsWith(href)
                    ? "text-vintage-gold"
                    : "text-vintage-cream hover:text-vintage-gold"
                  }
                `}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/kunde/anmelden"
              className="mt-6 px-4 py-3 border border-vintage-gold text-vintage-gold text-xs font-sans tracking-widest uppercase text-center hover:bg-vintage-gold hover:text-vintage-espresso transition-colors"
              style={{ borderRadius: "999px" }}
            >
              {t.nav.anmelden}
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
