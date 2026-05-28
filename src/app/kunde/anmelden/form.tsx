"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { customerLoginAction } from "./actions";
import { AuthShell } from "@/components/auth/auth-shell";

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
 * Kunden-Login — nutzt jetzt das shared AuthShell.
 *
 * Touch-Targets: Submit + Inputs jeweils min-h-12 (48px); touch-action:
 * manipulation entfernt iOS double-tap-zoom-Delay (300ms) das Buttons
 * unresponsive wirken lässt.
 * ────────────────────────────────────────────────────────────────────────── */
export function KundeAnmeldenForm({ labels }: { labels: KundeAnmeldenLabels }) {
  const [state, formAction, isPending] = useActionState(customerLoginAction, null);

  return (
    <AuthShell
      eyebrow={labels.mein_konto}
      titel={labels.anmelden_titel}
      footer={
        <>
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
        </>
      }
    >
      <form
        action={formAction}
        className="space-y-4"
        style={{ touchAction: "manipulation" }}
      >
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
            className="auth-input"
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
            <><Loader2 className="w-4 h-4 animate-spin" /> {labels.anmelden_lauft}</>
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
