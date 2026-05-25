"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Metadata wird in layout.tsx des (auth) Route Groups gesetzt
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-vintage-cream texture-paper px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-vintage-gold text-xl tracking-widest mb-2">✦</p>
          <h1 className="font-serif text-4xl text-vintage-espresso">
            Galerie du Temps
          </h1>
          <p className="text-vintage-dust text-sm tracking-wider mt-1 uppercase">
            Admin-Bereich
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-vintage-white border border-vintage-sand p-8"
          style={{
            borderRadius:            "var(--radius-card)",
            boxShadow:               "var(--shadow-vintage-md)",
          }}
        >
          <h2 className="font-serif text-xl text-vintage-espresso mb-6 text-center">
            Anmelden
          </h2>

          <form action={formAction} className="space-y-5">

            {/* E-Mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-sans uppercase tracking-widest text-vintage-brown mb-1.5"
              >
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                disabled={isPending}
                className="
                  w-full px-4 py-2.5
                  bg-vintage-cream border border-vintage-sand
                  text-vintage-ink text-sm font-sans
                  placeholder:text-vintage-dust
                  focus:outline-none focus:border-vintage-brown focus:ring-1 focus:ring-vintage-brown
                  disabled:opacity-50
                  transition-colors
                "
                style={{ borderRadius: "var(--radius-vintage)" }}
                placeholder="admin@galeriedutemps.kz"
              />
            </div>

            {/* Passwort */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-sans uppercase tracking-widest text-vintage-brown mb-1.5"
              >
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                disabled={isPending}
                className="
                  w-full px-4 py-2.5
                  bg-vintage-cream border border-vintage-sand
                  text-vintage-ink text-sm font-sans
                  placeholder:text-vintage-dust
                  focus:outline-none focus:border-vintage-brown focus:ring-1 focus:ring-vintage-brown
                  disabled:opacity-50
                  transition-colors
                "
                style={{ borderRadius: "var(--radius-vintage)" }}
                placeholder="••••••••"
              />
            </div>

            {/* Fehlermeldung */}
            {state?.error && (
              <div
                className="px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans"
                style={{ borderRadius: "var(--radius-vintage)" }}
                role="alert"
              >
                {state.error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="
                w-full py-3 mt-2
                bg-vintage-espresso text-vintage-cream
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-brown
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                transition-colors
              "
              style={{ borderRadius: "var(--radius-button)" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Anmelden …</span>
                </>
              ) : (
                "Anmelden"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-vintage-dust text-xs mt-6">
          © {new Date().getFullYear()} Galerie du Temps
        </p>
      </div>
    </main>
  );
}
