"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Users, Inbox, LayoutGrid } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * AppShell — mobile Operator-App-Hülle (Amina-/FB-Business-Suite-Stil).
 *
 * Sticky Top-Bar + untere 5-Tab-Leiste. Mobil-first, auf Desktop zentriert
 * (max-w). Die Daten-Tabs verlinken in die bestehenden /admin-Seiten
 * (responsiv), „Сегодня" + „Меню" leben in /app.
 * ────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { href: "/app",                 label: "Сегодня", icon: Home,       match: (p: string) => p === "/app" },
  { href: "/admin/bestellungen",  label: "Заказы",  icon: ShoppingBag, match: (p: string) => p.startsWith("/admin/bestellungen") },
  { href: "/admin/kunden",        label: "Клиенты", icon: Users,      match: (p: string) => p.startsWith("/admin/kunden") },
  { href: "/admin/leads",         label: "Лиды",    icon: Inbox,      match: (p: string) => p.startsWith("/admin/leads") },
  { href: "/app/menu",            label: "Меню",    icon: LayoutGrid, match: (p: string) => p.startsWith("/app/menu") },
];

export function AppShell({ children, userName }: { children: React.ReactNode; userName?: string | null }) {
  const pathname = usePathname();
  const initial = (userName ?? "A").charAt(0).toUpperCase();

  return (
    <div className="min-h-[100dvh] mx-auto max-w-md flex flex-col" style={{ background: "var(--color-paper)" }}>
      {/* Top-Bar */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur"
        style={{ background: "rgba(245,241,234,0.95)", borderBottom: "1px solid var(--color-line)" }}
      >
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-coral)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 15 }}
        >
          {initial}
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>
          Galerie <span style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>· Админ</span>
        </p>
      </header>

      {/* Inhalt */}
      <main className="flex-1 pb-24">{children}</main>

      {/* Untere Tab-Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 mx-auto max-w-md flex items-stretch justify-around"
        style={{ background: "#fff", borderTop: "1px solid var(--color-line)", paddingTop: 8, paddingBottom: "calc(max(10px, env(safe-area-inset-bottom)) + 4px)" }}
        aria-label="Навигация"
      >
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ minHeight: 48, touchAction: "manipulation", userSelect: "none" }}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={1.7} style={{ color: active ? "var(--color-coral)" : "var(--color-ink-mute)" }} />
              <span className="text-[9px] uppercase font-medium" style={{ letterSpacing: "0.12em", color: active ? "var(--color-coral)" : "var(--color-ink-mute)" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
