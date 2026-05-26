"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Loader2 } from "lucide-react";
import { Hourglass } from "@/components/brand/hourglass";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Login — Paper-BG mit Coral-CTA.
 *
 * Touch-Targets explizit ≥ 48px (iOS-Empfehlung 44px+, mit Buffer):
 * - Submit-Button min-h-12 (48px)
 * - Inputs min-h-12 (48px)
 * - touch-action: manipulation verhindert Double-Tap-Zoom-Delay (300ms)
 *   der manche „Button reagiert nicht"-Symptome verursacht
 * ────────────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
    >
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <Hourglass size={48} className="text-coral mx-auto mb-4" />
          <div className="wordmark mb-1" style={{ fontSize: 28, color: "var(--color-ink)" }}>
            GALERIE
          </div>
          <div className="wordmark-italic" style={{ fontSize: 14, color: "var(--color-ink-soft)" }}>
            du Temps
          </div>
          <p
            className="mt-4 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            Admin
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", border: "1px solid var(--color-line)", padding: "32px 28px" }}>
          <h1
            className="text-center mb-7"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   28,
              color:      "var(--color-ink)",
            }}
          >
            Вход
          </h1>

          <form action={formAction} className="space-y-4" style={{ touchAction: "manipulation" }}>

            <FormField label="E-Mail">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                disabled={isPending}
                placeholder="admin@galeriedutemps.kz"
                className="login-input"
              />
            </FormField>

            <FormField label="Passwort">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isPending}
                placeholder="••••••••"
                className="login-input"
              />
            </FormField>

            {state?.error && (
              <div
                role="alert"
                className="px-4 py-3 text-sm"
                style={{
                  background: "rgba(232,112,58,0.08)",
                  border:     "1px solid rgba(232,112,58,0.35)",
                  color:      "var(--color-coral-deep)",
                }}
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="btn-coral btn-coral-lg w-full"
              style={{
                minHeight:           48,
                touchAction:         "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Anmelden …
                </>
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center mt-6 text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          © {new Date().getFullYear()} Galerie du Temps
        </p>
      </div>

      {/* Lokale Input-Styles — sicherer als utility-classes weil sie direkt
          mit dem Brand-Token-System statt mit Cascade-Reihenfolgen arbeiten. */}
      <style>{`
        .login-input {
          width: 100%;
          min-height: 48px;
          padding: 12px 14px;
          background: var(--color-bone);
          border: 1px solid var(--color-line);
          color: var(--color-ink);
          font-family: var(--font-sans);
          font-size: 15px;
          line-height: 1.4;
          border-radius: 0;
          transition: border-color 150ms ease;
          touch-action: manipulation;
        }
        .login-input::placeholder { color: var(--color-ink-mute); font-style: italic; }
        .login-input:focus {
          outline: none;
          border-color: var(--color-coral);
        }
        .login-input:disabled { opacity: 0.5; }
      `}</style>
    </main>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="block mb-1.5 text-[10px] uppercase font-medium"
        style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
