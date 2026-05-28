"use client";

import { useEffect } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * ErudaLoader — Mobile-Debug-Konsole für die Telegram-Mini-App.
 *
 * In Telegram-Mobile gibt es keine Browser-DevTools. Eruda blendet eine
 * Konsole/Network/Elements-Ansicht direkt im WebView ein.
 *
 * Standardmäßig AUS. Aktivierung durch den Operator on-demand:
 *   - URL-Param ?eruda=1   → einmal aktivieren (bleibt dann via localStorage an)
 *   - ?eruda=0             → wieder ausschalten
 * Normale Kunden sehen nichts. Skript kommt per CDN (keine npm-Dependency).
 * ────────────────────────────────────────────────────────────────────────── */
export function ErudaLoader() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("eruda") === "0") {
        window.localStorage.removeItem("eruda");
        return;
      }
      const enabled = params.has("eruda") || window.localStorage.getItem("eruda") === "1";
      if (!enabled) return;
      window.localStorage.setItem("eruda", "1");

      const w = window as unknown as { eruda?: { init: () => void } };
      if (w.eruda) { w.eruda.init(); return; }

      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/eruda";
      s.onload = () => { try { w.eruda?.init(); } catch {/* ignore */} };
      document.body.appendChild(s);
    } catch {/* ignore */}
  }, []);

  return null;
}
