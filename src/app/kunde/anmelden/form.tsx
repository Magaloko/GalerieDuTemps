"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { customerLoginAction } from "./actions";
import { Hourglass } from "@/components/brand/hourglass";

export interface KundeAnmeldenLabels {
  mein_konto:     string;
  anmelden_titel: string;
  email:          string;
  passwort:       string;
  anmelden_btn:   string;
  anmelden_lauft: string;
  vergessen:      string;
  kein_account:   string;
  jetzt_register: string;
  zur_hauptseite: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Kunden-Login — Paper-BG mit Coral-CTA.
 *
 * Touch-Targets: Submit + Inputs jeweils min-h-12 (48px), touch-action:
 * manipulation entfernt iOS double-tap-zoom-Delay (300ms) das Buttons
 * unresponsive wirken lässt.
 *
 * min-h-[100dvh] statt min-h-screen weil iOS Safari's 100vh die URL-Bar
 * mitzählt und auf-/zuklappt — dvh ist die "dynamic viewport height" die
 * sich an die sichtbare Höhe anpasst.
 * ────────────────────────────────────────────────────────────────────────── */
export function KundeAnmeldenForm({ labels }: { labels: KundeAnmeldenLabels }) {
  const [state, formAction, isPending] = useActionState(customerLoginAction, null);

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
    >
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <Hourglass size={40} className="text-coral mx-auto mb-4" />
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
            {labels.mein_konto}
          </p>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--color-line)", padding: "32px 28px" }}>
          <h1
            className="text-center mb-7"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   28,
              color:      "var(--color-ink)",
            }}
          >
            {labels.anmelden_titel}
          </h1>

          <form action={formAction} className="space-y-4" style={{ touchAction: "manipulation" }}>

            <FormField label={labels.email}>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                disabled={isPending}
                placeholder="anna@example.kz"
                className="login-input"
              />
            </FormField>

            <FormField label={labels.passwort}>
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
                minHeight:               48,
                touchAction:             "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {labels.anmelden_lauft}
                </>
              ) : (
                labels.anmelden_btn
              )}
            </button>

            <p className="text-center text-sm">
              <Link
                href="/kunde/passwort-vergessen"
                className="transition-colors hover:opacity-80"
                style={{
                  color:      "var(--color-coral)",
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                }}
              >
                {labels.vergessen}
              </Link>
            </p>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {labels.kein_account}{" "}
            <Link
              href="/kunde/registrieren"
              className="hover:opacity-80 transition-opacity"
              style={{
                color:                "var(--color-coral)",
                textDecoration:       "underline",
                textUnderlineOffset:  2,
              }}
            >
              {labels.jetzt_register}
            </Link>
          </p>
          <p>
            <Link
              href="/"
              className="text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              ← {labels.zur_hauptseite}
            </Link>
          </p>
        </div>
      </div>

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
