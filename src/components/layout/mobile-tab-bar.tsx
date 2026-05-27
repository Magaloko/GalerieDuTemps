"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Sparkles, Heart, User } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import type { Dictionary } from "@/i18n";

type Item = {
  href:  string;
  label: string;
  icon:  React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  isActive: (pathname: string) => boolean;
};

/* ──────────────────────────────────────────────────────────────────────────
 * MobileTabBar — Handoff H2.
 * Persistent fixed bottom auf allen Mobile-Views. Cobalt-BG.
 * 5 Items: Главная · Каталог · Ассистент · Wishlist · Аккаунт.
 *   ↑ "Ассистент" ist die KI-Beratung (Hub für AI-Chat / Suche / Vintage-
 *     Empfehlungen). Ersetzt das ehemalige Quiz an der Center-Position —
 *     bewusst die prominenteste Stelle (Daumen-Reichweite Mittelfinger).
 * Active: coral Icon + Label + 2px Coral-Indicator über dem Icon.
 *
 * Im (public)/layout.tsx montiert. Versteckt auf md+ (lg).
 * ────────────────────────────────────────────────────────────────────────── */
export function MobileTabBar({ t }: { t: Dictionary }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const { ids }     = useWunschliste();
  const wunschCount = ids.length;

  // TODO i18n: nav.home, nav.kunde_account in messages/* ergänzen.
  const items: Item[] = [
    { href: "/",            label: "Главная",         icon: Home,     isActive: p => p === "/" },
    { href: "/katalog",     label: t.nav.katalog,     icon: Search,   isActive: p => p.startsWith("/katalog") || p.startsWith("/kategorien") },
    { href: "/assistent",   label: t.nav.assistent,   icon: Sparkles, isActive: p => p.startsWith("/assistent") },
    { href: "/wunschliste", label: t.nav.wunschliste, icon: Heart,    isActive: p => p.startsWith("/wunschliste") },
    { href: "/kunde",       label: "Аккаунт",         icon: User,     isActive: p => p.startsWith("/kunde") },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around"
      style={{
        background:    "var(--color-cobalt)",
        paddingTop:    12,
        // Safe-Area-Inset für iPhone-Notch + extra Reserve damit der letzte
        // Tab (rechts) nicht in der Browser-Edge-Touch-Zone landet (Android
        // Chrome bzw. Mobile-Safari haben dort oft System-Gesten die
        // Custom-Touch-Events abfangen).
        paddingBottom: "calc(max(20px, env(safe-area-inset-bottom)) + 8px)",
        borderTop:     "1px solid rgba(232,112,58,0.18)",
      }}
      aria-label="Mobile navigation"
    >
      {items.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        const isHeart = href === "/wunschliste";
        // Hybrid-Click-Handler: Falls Next.js-Link aus irgendeinem Grund den
        // Click nicht fängt (Mobile-Browser-Quirks), navigieren wir manuell
        // via router.push. onClick wird vor Link-Default ausgeführt, beides
        // greift — falls eins fehlschlägt, fällt's auf das andere zurück.
        return (
          <Link
            key={href}
            href={href}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2"
            style={{
              touchAction:             "manipulation",
              WebkitTapHighlightColor: "rgba(232,112,58,0.25)",
              minHeight:               48,
              userSelect:              "none",
            }}
            aria-current={active ? "page" : undefined}
            prefetch={false}
            onClick={(e) => {
              // Falls Modifier-Tasten (Strg/Cmd+Click etc.) → Default-Verhalten
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              // Sonst: explizit router.push damit Mobile-Browser-Quirks
              // (z.B. Touch-Cancel beim Bottom-Edge) keinen Effekt haben.
              e.preventDefault();
              router.push(href);
            }}
          >
            {/* Active indicator (2px coral bar above icon) */}
            {active && (
              <span
                aria-hidden
                className="absolute"
                style={{
                  top: -12, width: 12, height: 2,
                  background: "var(--color-coral)",
                }}
              />
            )}
            <span className="relative">
              <Icon
                className="w-[22px] h-[22px]"
                style={{ color: active ? "var(--color-coral)" : "rgba(255,255,255,0.65)" }}
              />
              {isHeart && wunschCount > 0 && (
                <span
                  className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 text-[9px] font-medium flex items-center justify-center"
                  style={{
                    background: "var(--color-coral)",
                    color: "#fff",
                    borderRadius: "999px",
                  }}
                >
                  {wunschCount > 9 ? "9+" : wunschCount}
                </span>
              )}
            </span>
            <span
              className="text-[9px] uppercase font-medium"
              style={{
                letterSpacing: "0.16em",
                color: active ? "var(--color-coral)" : "rgba(255,255,255,0.55)",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
