"use client";

import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * TelegramAuthGate
 *
 * Wird im Mini-App-Browser geöffnet. Erst-Aktion:
 *  1. window.Telegram.WebApp ready() + theme sync
 *  2. initData zu /api/telegram/auth POSTen → setzt Session-Cookie
 *  3. Wenn OK: children rendern
 *  4. Wenn Fehler: Fehler-Screen mit Retry
 *
 * Fallback: Wenn nicht in Telegram geöffnet (kein window.Telegram), zeige
 * Hinweis und Deep-Link zum Bot.
 * ────────────────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData:       string;
        initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } };
        ready():        void;
        expand():       void;
        themeParams:    Record<string, string>;
        colorScheme:    "light" | "dark";
        BackButton: { show(): void; hide(): void; onClick(cb: () => void): void };
        MainButton: { setText(t: string): void; show(): void; hide(): void; onClick(cb: () => void): void };
      };
    };
  }
}

type State =
  | { kind: "init" }
  | { kind: "no-telegram" }
  | { kind: "authing" }
  | { kind: "auth-error"; msg: string }
  | { kind: "ready"; customerName: string };

export function TelegramAuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ kind: "init" });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      setState({ kind: "no-telegram" });
      return;
    }

    tg.ready();
    tg.expand();

    setState({ kind: "authing" });
    fetch("/api/telegram/auth", {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ initData: tg.initData }),
      credentials: "include",
    })
      .then(async r => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((j: { customer: { vorname: string | null; email: string } }) => {
        setState({
          kind: "ready",
          customerName: j.customer.vorname || j.customer.email,
        });
      })
      .catch(err => {
        setState({ kind: "auth-error", msg: String(err.message ?? err) });
      });
  }, []);

  if (state.kind === "init" || state.kind === "authing") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-8">
        <p
          className="text-[12px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          Подключение…
        </p>
      </div>
    );
  }

  if (state.kind === "no-telegram") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center gap-4">
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          Mini App
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          Открой в Telegram
        </h1>
        <p
          className="text-sm max-w-xs"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          Эта страница работает внутри Telegram-приложения. Открой бот @GalerieDuTempsBot
          и нажми кнопку «Магазин».
        </p>
      </div>
    );
  }

  if (state.kind === "auth-error") {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 text-center gap-3">
        <p
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-coral-deep)" }}
        >
          Ошибка авторизации
        </p>
        <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
          {state.msg}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
