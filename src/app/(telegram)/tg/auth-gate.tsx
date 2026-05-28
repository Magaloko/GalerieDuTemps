"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * TelegramAuthGate + useTgIdentity hook
 *
 * Verantwortlichkeiten:
 *  1. Erkennt window.Telegram.WebApp + initData
 *  2. POSTet zu /api/telegram/auth → Session-Cookie wird gesetzt
 *  3. Liefert die aufgelöste Rolle (admin / customer / guest) via React-
 *     Context an children — die können dann rollenspezifisch rendern
 *  4. Renderfehler-Zustände: Timeout, HTTP-Fehler, „kein Telegram"
 *
 * 15-Sek-Timeout + Retry-Button + Konsolen-Logging für Telegram-Desktop-
 * DevTools-Debug.
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
        MainButton: { setText(t: string): void; show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
      };
    };
  }
}

const AUTH_TIMEOUT_MS = 15_000;

export type TgRole = "admin" | "customer" | "guest";

export interface TgIdentity {
  role: TgRole;
  name: string | null;
  email: string | null;
}

const TgIdentityContext = createContext<TgIdentity | null>(null);

export function useTgIdentity(): TgIdentity {
  return useContext(TgIdentityContext) ?? { role: "guest", name: null, email: null };
}

type State =
  | { kind: "init" }
  | { kind: "no-telegram" }
  | { kind: "authing" }
  | { kind: "auth-error"; msg: string; status?: number; detail?: string }
  | { kind: "ready"; identity: TgIdentity };

export function TelegramAuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState]     = useState<State>({ kind: "init" });
  const [attempt, setAttempt] = useState(0);

  const runAuth = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      console.warn("[TgAuth] no Telegram.WebApp.initData", {
        hasTelegram: !!window.Telegram,
        hasWebApp:   !!tg,
        initDataLen: tg?.initData?.length ?? 0,
      });
      setState({ kind: "no-telegram" });
      return;
    }

    tg.ready();
    tg.expand();

    setState({ kind: "authing" });
    console.log("[TgAuth] sending auth POST", {
      initDataLen: tg.initData.length,
      user:        tg.initDataUnsafe?.user,
    });

    const abortCtl = new AbortController();
    const timeout  = setTimeout(() => abortCtl.abort(), AUTH_TIMEOUT_MS);

    try {
      const r = await fetch("/api/telegram/auth", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ initData: tg.initData }),
        credentials: "include",
        signal:      abortCtl.signal,
      });
      clearTimeout(timeout);

      console.log("[TgAuth] response", { status: r.status, ok: r.ok });

      if (!r.ok) {
        let detail = "";
        try { const j = await r.json(); detail = j?.error ?? ""; }
        catch { /* not JSON */ }
        setState({
          kind:   "auth-error",
          msg:    detail || `Сервер вернул HTTP ${r.status}`,
          status: r.status,
          detail,
        });
        return;
      }

      const j = await r.json() as {
        role?: TgRole;
        user?: { vorname?: string | null; name?: string | null; email?: string };
        customer?: { vorname?: string | null; email?: string }; // backwards-compat
      };

      const role:  TgRole = j.role ?? (j.customer ? "customer" : "guest");
      const name:  string | null = j.user?.vorname ?? j.user?.name ?? j.customer?.vorname ?? null;
      const email: string | null = j.user?.email ?? j.customer?.email ?? null;

      setState({
        kind:     "ready",
        identity: { role, name, email },
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg     = err instanceof Error ? err.message : String(err);
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.error("[TgAuth] fetch error", err);
      setState({
        kind:   "auth-error",
        msg:    isAbort
          ? `Сервер не ответил за ${AUTH_TIMEOUT_MS / 1000} сек.`
          : msg,
        detail: isAbort ? "timeout" : "network",
      });
    }
  }, []);

  useEffect(() => { runAuth(); }, [runAuth, attempt]);

  if (state.kind === "init" || state.kind === "authing") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-8">
        <Spinner />
        <p
          className="text-[11px] uppercase font-medium"
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
          Эта страница работает внутри Telegram. Открой нашего бота
          и нажми «🛍 Магазин».
        </p>
      </div>
    );
  }

  if (state.kind === "auth-error") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center gap-3">
        <p
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-coral-deep, #A53E26)" }}
        >
          ✕ Ошибка авторизации
        </p>
        <p
          className="text-sm max-w-xs"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {state.msg}
        </p>
        {state.status && (
          <p
            className="font-mono text-[10px]"
            style={{ color: "var(--color-ink-mute)" }}
          >
            HTTP {state.status} {state.detail ? `· ${state.detail}` : ""}
          </p>
        )}
        <button
          type="button"
          onClick={() => setAttempt(n => n + 1)}
          className="mt-4 px-5 py-2 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.22em",
            background:    "var(--color-coral)",
            color:         "#fff",
            touchAction:   "manipulation",
          }}
        >
          Повторить
        </button>
        <p
          className="text-[10px] mt-2"
          style={{ color: "var(--color-ink-mute)" }}
        >
          Если ошибка повторяется — напишите в @galeriediutemps_bot.
        </p>
      </div>
    );
  }

  return (
    <TgIdentityContext.Provider value={state.identity}>
      {children}
    </TgIdentityContext.Provider>
  );
}

function Spinner() {
  return (
    <div
      aria-hidden
      className="w-6 h-6"
      style={{
        border:       "2px solid var(--color-line)",
        borderTop:    "2px solid var(--color-coral)",
        borderRadius: "50%",
        animation:    "tg-spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes tg-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
