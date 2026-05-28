"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Heart, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/lib/cart";

/* ──────────────────────────────────────────────────────────────────────────
 * MiniAppTabBar — fixed bottom-bar im Telegram-WebView.
 *
 * Wichtig: paddingBottom = env(safe-area-inset-bottom) damit auf iPhone-Notch
 * der letzte Tab nicht in der Home-Indicator-Zone landet.
 *
 * Aktive-Erkennung über usePathname — wenn der Route-Path mit dem Tab-href
 * beginnt (für nested-Pages wie /tg/produkt/foo zählt Каталог als aktiv).
 *
 * Cart-Badge zeigt Item-Anzahl (Live aus zustand-Store).
 * ────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { href: "/tg",             label: "Каталог",   icon: Home,          isActive: (p: string) => p === "/tg" || p.startsWith("/tg/produkt") },
  { href: "/tg/wunschliste", label: "Избранное", icon: Heart,         isActive: (p: string) => p.startsWith("/tg/wunschliste") },
  { href: "/tg/cart",        label: "Корзина",   icon: ShoppingBag,   isActive: (p: string) => p.startsWith("/tg/cart") },
  { href: "/tg/profil",      label: "Профиль",   icon: User,          isActive: (p: string) => p.startsWith("/tg/profil") || p.startsWith("/tg/orders") },
];

export function MiniAppTabBar() {
  const pathname = usePathname();
  const cartCount = useCart(s => s.items.reduce((acc, i) => acc + i.menge, 0));

  // Auf /tg/cart selbst nicht doppelt zeigen (MainButton übernimmt CTA dort)
  // — aber Navigation bleibt verfügbar.

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 flex items-stretch justify-around"
      style={{
        background:    "var(--tg-theme-secondary-bg-color, #fff)",
        borderTop:     "1px solid var(--color-line)",
        paddingTop:    8,
        paddingBottom: "calc(max(8px, env(safe-area-inset-bottom)) + 4px)",
      }}
      aria-label="Mini-App Navigation"
    >
      {TABS.map(({ href, label, icon: Icon, isActive }) => {
        const active = isActive(pathname);
        const isCart = href === "/tg/cart";
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5"
            style={{
              touchAction:             "manipulation",
              WebkitTapHighlightColor: "transparent",
              minHeight:               48,
              userSelect:              "none",
            }}
            aria-current={active ? "page" : undefined}
          >
            <span className="relative">
              <Icon
                className="w-[22px] h-[22px]"
                style={{
                  color: active
                    ? "var(--tg-theme-link-color, var(--color-coral))"
                    : "var(--tg-theme-hint-color, var(--color-ink-mute))",
                }}
              />
              {isCart && cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 text-[10px] font-medium flex items-center justify-center"
                  style={{
                    background:   "var(--color-coral)",
                    color:        "#fff",
                    borderRadius: 999,
                  }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </span>
            <span
              className="text-[9px] uppercase font-medium"
              style={{
                letterSpacing: "0.12em",
                color: active
                  ? "var(--tg-theme-link-color, var(--color-coral))"
                  : "var(--tg-theme-hint-color, var(--color-ink-mute))",
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
