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

    // Auto-Reload, wenn ein NEUER Service-Worker die Kontrolle übernimmt
    // (z.B. nach einem Deploy mit neuer SW-Version). Heilt eine PWA, die noch
    // einen veralteten App-Shell anzeigt — einmalig, ohne Reload-Schleife.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => { reg.update().catch(() => {}); })   // sofort auf Updates prüfen
        .catch(() => {/* still — PWA ist optional */});
    };
    // Nach Load registrieren, damit der erste Paint nicht konkurriert.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
