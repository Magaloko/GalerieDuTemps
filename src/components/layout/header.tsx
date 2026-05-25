"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Heart, Menu, X, Store } from "lucide-react";
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

  const NAV_LINKS = [
    { href: "/katalog",    label: t.nav.katalog    },
    { href: "/kategorien", label: t.nav.kategorien },
    { href: "/about",      label: t.nav.about      },
    { href: "/kontakt",    label: t.nav.kontakt    },
  ];

  // Suche schließen bei Route-Wechsel
  useEffect(() => { setMenuOffen(false); setSucheOffen(false); }, [pathname]);

  // Fokus auf Suche setzen
  useEffect(() => {
    if (sucheOffen) sucheRef.current?.focus();
  }, [sucheOffen]);

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
        bg-vintage-white/95 backdrop-blur-sm
        border-b border-vintage-sand
      " style={{ boxShadow: "var(--shadow-vintage-xs)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
              <Store className="w-5 h-5 text-vintage-gold group-hover:scale-110 transition-transform" />
              <div className="leading-tight">
                <span className="font-serif text-xl text-vintage-espresso">
                  Galerie du Temps
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`
                    text-sm font-sans tracking-wide transition-colors
                    ${pathname.startsWith(href)
                      ? "text-vintage-espresso border-b border-vintage-gold pb-0.5"
                      : "text-vintage-dust hover:text-vintage-espresso"
                    }
                  `}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Aktionen */}
            <div className="flex items-center gap-1">
              {/* Suche */}
              <button
                onClick={() => setSucheOffen(v => !v)}
                className="p-2 text-vintage-dust hover:text-vintage-espresso hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-card)" }}
                aria-label={t.nav.suche}
              >
                {sucheOffen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>

              {/* Wunschliste */}
              <Link
                href="/wunschliste"
                className="relative p-2 text-vintage-dust hover:text-vintage-espresso hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-card)" }}
                aria-label={`${t.nav.wunschliste} (${ids.length})`}
              >
                <Heart className="w-5 h-5" />
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

              {/* Sprache */}
              <LanguageSwitcher ariaLabel={t.nav.sprache} />

              {/* Warenkorb */}
              <CartBadge />

              {/* Mobile Menü */}
              <button
                onClick={() => setMenuOffen(v => !v)}
                className="md:hidden p-2 text-vintage-dust hover:text-vintage-espresso hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-card)" }}
                aria-label={t.nav.menu}
              >
                {menuOffen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Suche-Leiste (ausklappbar) */}
          {sucheOffen && (
            <div className="pb-4">
              <form onSubmit={handleSuche} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-dust pointer-events-none" />
                <input
                  ref={sucheRef}
                  type="search"
                  value={suchText}
                  onChange={e => setSuchText(e.target.value)}
                  placeholder={t.nav.suche_placeholder}
                  className="
                    w-full pl-11 pr-4 py-3
                    bg-vintage-cream border border-vintage-sand
                    text-vintage-ink font-sans text-sm
                    focus:outline-none focus:border-vintage-brown
                    transition-colors
                  "
                  style={{ borderRadius: "var(--radius-card)" }}
                />
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {menuOffen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-vintage-ink/40 backdrop-blur-sm"
            onClick={() => setMenuOffen(false)}
          />
          <nav
            className="absolute right-0 top-0 bottom-0 w-72 bg-vintage-white flex flex-col pt-20 px-6 pb-6 shadow-2xl"
          >
            <p className="text-vintage-gold text-xs tracking-widest mb-6 uppercase">{t.nav.menu}</p>
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`
                  py-3 border-b border-vintage-sand/50
                  font-serif text-xl transition-colors
                  ${pathname.startsWith(href)
                    ? "text-vintage-espresso"
                    : "text-vintage-brown hover:text-vintage-espresso"
                  }
                `}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
