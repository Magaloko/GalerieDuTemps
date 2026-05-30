"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Users, Inbox, LayoutGrid } from "lucide-react";
import { ViewSwitch } from "@/components/layout/view-switch";

/* ──────────────────────────────────────────────────────────────────────────
 * AppShell — mobile Operator-App-Hülle (Amina-/FB-Business-Suite-Stil).
 *
 * Sticky Top-Bar + untere 5-Tab-Leiste. Mobil-first, auf Desktop zentriert
 * (max-w). Die Daten-Tabs verlinken in die bestehenden /admin-Seiten
 * (responsiv), „Сегодня" + „Меню" leben in /app.
 * ────────────────────────────────────────────────────────────────────────── */

// Generische /admin-Sektion (aus dem Kachelmenü geöffnet) → „Меню" aktiv
// markieren, außer es ist eine der eigenen Daten-Tab-Routen.
const istModulPfad = (p: string, modul: string) =>
  p.startsWith(`/app/${modul}`) || p.startsWith(`/admin/${modul}`);

// Generische Sektion (aus dem Kachelmenü) → „Меню" aktiv, außer es ist eine
// der eigenen Daten-Tab-Routen (egal ob unter /app oder /admin gerendert).
const istMenueSektion = (p: string) =>
  p.startsWith("/app/menu") ||
  ((p.startsWith("/admin") || p.startsWith("/app")) &&
    !istModulPfad(p, "bestellungen") &&
    !istModulPfad(p, "kunden") &&
    !istModulPfad(p, "leads") &&
    p !== "/app");

const TABS = [
  { href: "/app",               label: "Сегодня", icon: Home,        match: (p: string) => p === "/app" },
  { href: "/app/bestellungen",  label: "Заказы",  icon: ShoppingBag, match: (p: string) => istModulPfad(p, "bestellungen") },
  { href: "/app/kunden",        label: "Клиенты", icon: Users,       match: (p: string) => istModulPfad(p, "kunden") },
  { href: "/app/leads",         label: "Лиды",    icon: Inbox,       match: (p: string) => istModulPfad(p, "leads") },
  { href: "/app/menu",          label: "Меню",    icon: LayoutGrid,  match: istMenueSektion },
];

/**
 * AppShell — Operator-App-Hülle (Top-Bar + untere 5-Tab-Leiste).
 *
 * `fluid`: für eingebettete /admin-Arbeitsflächen (Tabellen/Editoren) → volle
 * Breite + eigene Content-Paddings. Ohne `fluid` (Default, /app-Seiten wie
 * Сегодня/Меню) bleibt die zentrierte max-w-md-Spalte.
 */
export function AppShell({
  children, userName, fluid = false,
}: { children: React.ReactNode; userName?: string | null; fluid?: boolean }) {
  const pathname = usePathname();
  const initial = (userName ?? "A").charAt(0).toUpperCase();

  return (
    // Äußerer Wrapper trägt den Paper-Hintergrund über die VOLLE Breite —
    // sonst zeigt sich auf iPad/Desktop neben der max-w-md-Spalte der dunkle
    // espresso <body>-Hintergrund. Innen wird die Spalte zentriert (außer fluid).
    <div className="min-h-[100dvh]" style={{ background: "var(--color-paper)" }}>
    <div className={`min-h-[100dvh] flex flex-col ${fluid ? "" : "mx-auto max-w-md"}`} style={{ background: "var(--color-paper)" }}>
      {/* Top-Bar */}
      <header className="app-bar sticky top-0 z-20 flex items-center gap-3 px-4 py-3">
        <div className="app-avatar">
          {initial}
        </div>
        <p className="flex-1 min-w-0 truncate whitespace-nowrap" style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>
          Galerie <span style={{ color: "var(--color-ink-mute)", fontSize: 13 }}>· Админ</span>
        </p>
        {/* App ↔ Klassik-Umschalter — Cookie-Default = App */}
        <ViewSwitch current="app" compact />
      </header>

      {/* Inhalt — Spacer = Tab-Bar-Höhe inkl. Safe-Area (statt fixem pb-24,
          das auf Notch-Geräten knapp wird). fluid → eigene Paddings für
          eingebettete /admin-Seiten (die sonst auf das Layout-Padding bauen). */}
      <main
        className={`flex-1 ${fluid ? "px-4 md:px-6 py-5" : ""}`}
        style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </main>

      {/* Untere Tab-Bar — fluid: volle Breite; sonst zentriert max-w-md */}
      <nav
        className={`app-tabbar fixed bottom-0 inset-x-0 z-30 mx-auto flex items-stretch justify-around ${fluid ? "" : "max-w-md"}`}
        style={{ paddingTop: 8, paddingBottom: "calc(max(10px, env(safe-area-inset-bottom)) + 4px)" }}
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
              <span className="text-[9px] uppercase font-medium whitespace-nowrap" style={{ letterSpacing: "0.12em", color: active ? "var(--color-coral)" : "var(--color-ink-mute)" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
    </div>
  );
}
