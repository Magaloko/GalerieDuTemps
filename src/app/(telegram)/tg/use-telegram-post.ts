"use client";

import { useState, useCallback } from "react";

export interface TgPostResult<T = Record<string, unknown>> {
  ok:     boolean;
  status: number;
  data:   T;
  /** Gesetzt bei Transport-/initData-Fehlern (nicht bei HTTP-Fehlerstatus). */
  error?: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * useTelegramPost — gemeinsamer Mini-App-POST-Helfer.
 *
 * Kapselt das wiederkehrende Boilerplate der Mini-App-Forms: initData aus
 * window.Telegram.WebApp lesen, JSON mit credentials:'include' senden, Antwort
 * robust parsen, busy-State verwalten. Jede Form behält ihre eigene Erfolgs-/
 * Fehler-Darstellung — der Hook liefert nur { ok, status, data, error }.
 * ────────────────────────────────────────────────────────────────────────── */
export function useTelegramPost() {
  const [busy, setBusy] = useState(false);

  const post = useCallback(async <T = Record<string, unknown>>(
    url:  string,
    body: Record<string, unknown> = {},
  ): Promise<TgPostResult<T>> => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (!tg?.initData) {
      return { ok: false, status: 0, data: {} as T, error: "Откройте Mini-App через бот, а не в обычном браузере." };
    }
    setBusy(true);
    try {
      const r = await fetch(url, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ initData: tg.initData, ...body }),
        credentials: "include",
      });
      const data = (await r.json().catch(() => ({}))) as T;
      return { ok: r.ok, status: r.status, data };
    } catch {
      return { ok: false, status: 0, data: {} as T, error: "Сеть недоступна. Попробуйте ещё раз." };
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, post };
}
