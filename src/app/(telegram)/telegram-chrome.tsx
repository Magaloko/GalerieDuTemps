"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { haptic } from "./tg/fx";

/* ──────────────────────────────────────────────────────────────────────────
 * TelegramChrome — zentrale native WebApp-Steuerung (einmal im Layout).
 *
 *  1. ready() + expand()  → Vollhöhe, kein halb-aufgeklappter Zustand
 *  2. disableVerticalSwipes() (v7.7+) → kein versehentliches Zuschwenken
 *     beim Scrollen in der Liste
 *  3. setHeaderColor/setBackgroundColor an die TG-Theme-Hintergrundfarbe →
 *     nahtloser Übergang Header ↔ Inhalt (passt sich Hell/Dunkel an)
 *  4. Nativer BackButton: auf Unterseiten anzeigen → router.back(); auf den
 *     Tab-Wurzeln ausblenden. Ein stabiler Handler, per Ref aktualisiert.
 *
 * Alles defensiv ge-guarded (älterer Client / Browser-Fallback = no-op).
 * ────────────────────────────────────────────────────────────────────────── */

interface TgWebApp {
  ready?: () => void;
  expand?: () => void;
  isVersionAtLeast?: (v: string) => boolean;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  colorScheme?: "light" | "dark";
  viewportStableHeight?: number;
  onEvent?: (ev: string, cb: () => void) => void;
  offEvent?: (ev: string, cb: () => void) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (cb: () => void) => void; offClick: (cb: () => void) => void };
}

// Tab-Wurzeln: hier KEIN Back-Button (die Tab-Bar ist die Navigation).
const ROOTS = new Set<string>([
  "/tg",
  "/tg/wunschliste",
  "/tg/cart",
  "/tg/kontakt",
  "/tg/profil",
  "/tg/admin",
  "/tg/admin/inbox",
  "/tg/admin/orders",
]);

function getWebApp(): TgWebApp | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

export function TelegramChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const backHandler = useRef<() => void>(() => {});

  // ── Einmalige Initialisierung ───────────────────────────────────────────
  useEffect(() => {
    const tg = getWebApp();
    if (!tg) return;
    try { tg.ready?.(); } catch {}
    try { tg.expand?.(); } catch {}
    // Vertikale Swipes erst ab 7.7 sperrbar.
    try {
      if (!tg.isVersionAtLeast || tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes?.();
    } catch {}
    // Header/BG an Theme-Hintergrund koppeln (nahtlos, hell/dunkel-adaptiv).
    try {
      if (!tg.isVersionAtLeast || tg.isVersionAtLeast("6.9")) {
        tg.setHeaderColor?.("bg_color");
        tg.setBackgroundColor?.("bg_color");
      }
    } catch {}

    // ── Dark-/Light-Theme an <html data-tg-theme> spiegeln ────────────────
    // Telegram injiziert --tg-theme-*-Variablen, aber unsere markeneigenen
    // Tokens (--color-line/paper/ink…) sind hell verdrahtet. data-tg-theme
    // schaltet die Dark-Overrides in globals.css frei, damit helle Borders/
    // Flächen im Telegram-Dunkelmodus nicht „glühen".
    const applyTheme = () => {
      try {
        const scheme = tg.colorScheme === "dark" ? "dark" : "light";
        document.documentElement.dataset.tgTheme = scheme;
      } catch {}
    };
    applyTheme();

    // ── Viewport-Höhe als CSS-Var (--tg-vh) ───────────────────────────────
    // dvh ist im Telegram-WebView unzuverlässig (TG-Chrome liegt außerhalb des
    // dvh-Modells). viewportStableHeight ist die echte nutzbare Höhe; bei
    // Tastatur/Expand ändert sie sich → wir tracken sie.
    const applyViewport = () => {
      try {
        const h = tg.viewportStableHeight;
        if (typeof h === "number" && h > 0) {
          document.documentElement.style.setProperty("--tg-vh", `${h}px`);
        }
      } catch {}
    };
    applyViewport();

    try { tg.onEvent?.("themeChanged", applyTheme); } catch {}
    try { tg.onEvent?.("viewportChanged", applyViewport); } catch {}

    // Stabilen Back-Handler genau einmal registrieren.
    const stable = () => backHandler.current();
    try { tg.BackButton?.onClick(stable); } catch {}

    // ── Keyboard-aware: fokussiertes Eingabefeld in Sicht scrollen ─────────
    // Öffnet sich (iOS) die Tastatur, schrumpft der Viewport, aber nichts
    // scrollt den Submit-Button nach oben. Wir scrollen das fokussierte Feld
    // nach kurzer Verzögerung (Keyboard-Animation) zentriert in den Blick.
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        setTimeout(() => {
          try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch {}
        }, 300);
      }
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      try { tg.BackButton?.offClick(stable); } catch {}
      try { tg.offEvent?.("themeChanged", applyTheme); } catch {}
      try { tg.offEvent?.("viewportChanged", applyViewport); } catch {}
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  // ── BackButton pro Route zeigen/verstecken + Aktion setzen ───────────────
  useEffect(() => {
    const tg = getWebApp();
    if (!tg?.BackButton) return;
    const isRoot = ROOTS.has(pathname);
    backHandler.current = () => {
      haptic("light");
      router.back();
    };
    try {
      if (isRoot) tg.BackButton.hide();
      else tg.BackButton.show();
    } catch {}
  }, [pathname, router]);

  return null;
}
