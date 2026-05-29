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

    // Stabilen Back-Handler genau einmal registrieren.
    const stable = () => backHandler.current();
    try { tg.BackButton?.onClick(stable); } catch {}
    return () => { try { tg.BackButton?.offClick(stable); } catch {} };
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
