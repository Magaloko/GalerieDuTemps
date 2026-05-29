"use client";

import { useEffect } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * ServiceWorkerRegister — registriert /sw.js (PWA-Installierbarkeit + Offline).
 *
 * - Nur im Browser, nur wenn serviceWorker unterstützt wird.
 * - NICHT in der Telegram-WebView (dort ist die Mini-App selbst „die App";
 *   ein SW bringt nichts und könnte Telegram-Routing stören).
 * - Rendert nichts.
 * ────────────────────────────────────────────────────────────────────────── */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Telegram-WebView erkennen → dort NICHT registrieren.
    const inTelegram = Boolean((window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData);
    if (inTelegram) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {/* still — PWA ist optional */});
    };
    // Nach Load registrieren, damit der erste Paint nicht konkurriert.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
