"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * ToastProvider — geteiltes Feedback-System (Web · Admin · /app · Mini-App).
 *
 * `useToast()` liefert { success, error, info }. Auto-Dismiss nach ~4,5 s,
 * manuell schließbar. Brand-Styling (Cobalt-Karte + Coral/Sage/Coral-Deep-
 * Akzentlinie), oben zentriert, über allem (z-index hoch). Ersetzt alert().
 *
 * SSR-safe: `useToast()` außerhalb des Providers → stiller No-op.
 * Im Root-Layout gemountet → überall verfügbar (auch Telegram-WebView).
 * ────────────────────────────────────────────────────────────────────────── */

type ToastKind = "success" | "error" | "info";
interface Toast { id: number; kind: ToastKind; msg: string }

interface ToastApi {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
}

const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} };
const ToastCtx = createContext<ToastApi>(NOOP);

export function useToast(): ToastApi {
  return useContext(ToastCtx);
}

const META: Record<ToastKind, { icon: React.ElementType; accent: string }> = {
  success: { icon: CheckCircle2, accent: "var(--color-sage, #7A8B6F)" },
  error:   { icon: AlertCircle,  accent: "var(--color-coral-deep, #C95820)" },
  info:    { icon: Info,         accent: "var(--color-coral, #E8703A)" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, kind, msg }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    success: m => push("success", m),
    error:   m => push("error", m),
    info:    m => push("info", m),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)", zIndex: 9999 }}
      >
        {toasts.map(t => {
          const { icon: Icon, accent } = META[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto w-full flex items-start gap-3 px-4 py-3 shadow-lg"
              style={{
                background:      "var(--tg-theme-section-bg-color, var(--color-app-surface, #fff))",
                border:          "1px solid var(--color-line, rgba(0,0,0,0.10))",
                borderLeft:      `3px solid ${accent}`,
                borderRadius:    4,
                animation:       "gdt-toast-in 220ms cubic-bezier(0.2,0.7,0.3,1)",
                boxShadow:       "0 4px 16px rgba(15,20,48,0.12), 0 1px 4px rgba(15,20,48,0.06)",
              }}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />
              <p className="flex-1 text-sm leading-snug" style={{ color: "var(--tg-theme-text-color, var(--color-ink, #0F1430))" }}>
                {t.msg}
              </p>
              <button
                onClick={() => remove(t.id)}
                aria-label="Закрыть"
                className="shrink-0 -mr-1 -mt-0.5 p-1 opacity-50 hover:opacity-100 transition-opacity"
                style={{ touchAction: "manipulation" }}
              >
                <X className="w-3.5 h-3.5" style={{ color: "var(--color-ink-mute, #7A7D92)" }} />
              </button>
            </div>
          );
        })}
      </div>
      {/* gdt-toast-in keyframe liegt in globals.css */}
    </ToastCtx.Provider>
  );
}
