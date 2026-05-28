"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Login. Touch-Targets ≥ 48px (iOS-Empfehlung 44px + Buffer);
 * touch-action: manipulation eliminiert das 300ms Double-Tap-Zoom-Delay
 * das auf iOS-Safari als „Button reagiert nicht" wahrgenommen wird.
 *
 * NB: Russisch, NICHT Deutsch — der Admin-Bereich ist konsistent RU mit
 * dem Rest der App; nur ENV-Variablen / DB-Spalten bleiben en/de.
 * ────────────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <AuthShell eyebrow="Admin" titel="Вход">
      <form
        action={formAction}
        className="space-y-4"
        style={{ touchAction: "manipulation" }}
      >
        <FormField label="E-mail">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            disabled={isPending}
            placeholder="admin@galeriedutemps.kz"
            className="auth-input"
          />
        </FormField>

        <FormField label="Пароль">
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            disabled={isPending}
            placeholder="••••••••"
            className="auth-input"
          />
        </FormField>

        {state?.error && (
          <div
            role="alert"
            className="px-4 py-3 text-sm"
            style={{
              background: "rgba(232,112,58,0.08)",
              border:     "1px solid rgba(232,112,58,0.35)",
              color:      "var(--color-coral-deep, #A53E26)",
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
            minHeight:               48,
            touchAction:             "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Вход…</>
          ) : (
            "Войти"
          )}
        </button>
      </form>

      {/* Lokale Input-Styles — direkter Brand-Token-Zugriff statt Cascade-
          Reihenfolge-Roulette. Class-Name auth-input wird von allen Auth-
          Pages geteilt (siehe FormField unten). */}
      <style>{`
        .auth-input {
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
        .auth-input::placeholder { color: var(--color-ink-mute); font-style: italic; }
        .auth-input:focus { outline: none; border-color: var(--color-coral); }
        .auth-input:disabled { opacity: 0.5; }
      `}</style>
    </AuthShell>
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
