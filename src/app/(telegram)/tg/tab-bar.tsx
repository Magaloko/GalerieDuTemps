"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Heart, ShoppingBag, User, Inbox, Package, Shield, MessageCircle,
} from "lucide-react";
import { useCart } from "@/lib/cart";

/* ──────────────────────────────────────────────────────────────────────────
 * MiniAppTabBar — role-aware Bottom-Navigation.
 *
 * Liest beim Mount /api/telegram/whoami um die Rolle zu ermitteln. Bis
 * Antwort da ist, rendert nur die guest-Tabs (Standard). Nach Rolle-
 * Detection wechselt das Tab-Set:
 *
 *  - admin/manager: Inbox · Заказы · Каталог · Профиль
 *  - customer:      Каталог · Избранное · Корзина · Профиль
 *  - guest:         Каталог · Избранное · Корзина · Профиль (Profil hat
 *                   Link-Account-Form)
 *
 * Hinweis: TabBar lebt im (telegram)/layout.tsx, AUßERHALB von AuthGate
 * (das ist pro Page). Daher kommt das Identity NICHT via Context, sondern
 * per HTTP-Cookie über /api/telegram/whoami (das Cookie wird beim ersten
 * Page-Load vom AuthGate gesetzt).
 * ────────────────────────────────────────────────────────────────────────── */

type Role = "admin" | "customer" | "guest";

interface Tab {
  href:    string;
  label:   string;
  icon:    React.ElementType;
  isActive: (p: string) => boolean;
}

// Shop-Modus: mit Korzina-Tab.
const TABS_GUEST_CUSTOMER: Tab[] = [
  { href: "/tg",             label: "Каталог",   icon: Home,        isActive: p => p === "/tg" || p.startsWith("/tg/produkt") },
  { href: "/tg/wunschliste", label: "Избранное", icon: Heart,       isActive: p => p.startsWith("/tg/wunschliste") },
  { href: "/tg/cart",        label: "Корзина",   icon: ShoppingBag, isActive: p => p.startsWith("/tg/cart") },
  { href: "/tg/profil",      label: "Профиль",   icon: User,        isActive: p => p.startsWith("/tg/profil") || p.startsWith("/tg/orders") },
];

// Schaufenster-Modus: kein Korzina-Tab, stattdessen «Связаться» (Kurator-Anfrage).
const TABS_GUEST_CUSTOMER_SCHAUFENSTER: Tab[] = [
  { href: "/tg",             label: "Каталог",   icon: Home,          isActive: p => p === "/tg" || p.startsWith("/tg/produkt") },
  { href: "/tg/wunschliste", label: "Избранное", icon: Heart,         isActive: p => p.startsWith("/tg/wunschliste") },
  { href: "/tg/kontakt",     label: "Связаться", icon: MessageCircle, isActive: p => p.startsWith("/tg/kontakt") },
  { href: "/tg/profil",      label: "Профиль",   icon: User,          isActive: p => p.startsWith("/tg/profil") || p.startsWith("/tg/orders") },
];

const TABS_ADMIN: Tab[] = [
  { href: "/tg/admin",         label: "Админ",   icon: Shield,  isActive: p => p === "/tg/admin" },
  { href: "/tg/admin/inbox",   label: "Inbox",   icon: Inbox,   isActive: p => p.startsWith("/tg/admin/inbox") },
  { href: "/tg/admin/orders",  label: "Заказы",  icon: Package, isActive: p => p.startsWith("/tg/admin/orders") },
  { href: "/tg",               label: "Каталог", icon: Home,    isActive: p => p === "/tg" || p.startsWith("/tg/produkt") },
];

export function MiniAppTabBar({ kaufenAktiv = true }: { kaufenAktiv?: boolean }) {
  const pathname  = usePathname();
  const [role, setRole] = useState<Role>("guest");
  const cartCount = useCart(s => s.items.reduce((acc, i) => acc + i.menge, 0));

  // Role einmal pro Mount fetchen. Wenn 401 / network-error → bleibt guest.
  useEffect(() => {
    let aborted = false;
    fetch("/api/telegram/whoami", { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (aborted || !d) return;
        if (d.role === "admin" || d.role === "customer") {
          setRole(d.role);
        }
      })
      .catch(() => {/* silent — bleibt guest */});
    return () => { aborted = true; };
  }, [pathname]);  // re-check beim Navigieren (z.B. nach claim-success)

  const tabs =
    role === "admin"
      ? TABS_ADMIN
      : kaufenAktiv
        ? TABS_GUEST_CUSTOMER
        : TABS_GUEST_CUSTOMER_SCHAUFENSTER;

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
      {tabs.map(({ href, label, icon: Icon, isActive }) => {
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
