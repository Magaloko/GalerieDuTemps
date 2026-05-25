"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, User } from "lucide-react";
import { customerLoginAction } from "./actions";

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

export function KundeAnmeldenForm({ labels }: { labels: KundeAnmeldenLabels }) {
  const [state, formAction, isPending] = useActionState(customerLoginAction, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-vintage-espresso texture-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <User className="w-6 h-6 text-vintage-gold mx-auto mb-2" />
          <h1 className="font-serif text-4xl text-vintage-cream">{labels.mein_konto}</h1>
          <p className="text-vintage-dust text-sm tracking-wider mt-1 uppercase">Galerie du Temps</p>
        </div>

        <div className="bg-vintage-brown border border-vintage-sand/40 p-8" style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-md)" }}>
          <h2 className="font-serif text-xl text-vintage-cream mb-6 text-center">{labels.anmelden_titel}</h2>

          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-sans uppercase tracking-widest text-vintage-cream/80 mb-1.5">{labels.email}</label>
              <input id="email" name="email" type="email" required autoComplete="email" disabled={isPending}
                className="w-full px-4 py-2.5 bg-vintage-espresso border border-vintage-sand/40 text-vintage-cream text-sm font-sans placeholder:text-vintage-dust focus:outline-none focus:border-vintage-brown focus:ring-1 focus:ring-vintage-brown disabled:opacity-50 transition-colors"
                style={{ borderRadius: "var(--radius-vintage)" }}
                placeholder="anna@example.kz" />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-sans uppercase tracking-widest text-vintage-cream/80 mb-1.5">{labels.passwort}</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" disabled={isPending}
                className="w-full px-4 py-2.5 bg-vintage-espresso border border-vintage-sand/40 text-vintage-cream text-sm font-sans placeholder:text-vintage-dust focus:outline-none focus:border-vintage-brown focus:ring-1 focus:ring-vintage-brown disabled:opacity-50 transition-colors"
                style={{ borderRadius: "var(--radius-vintage)" }}
                placeholder="••••••••" />
            </div>

            {state?.error && (
              <div className="px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }} role="alert">
                {state.error}
              </div>
            )}

            <button type="submit" disabled={isPending}
              className="w-full py-3 mt-2 bg-vintage-gold text-vintage-espresso font-sans text-xs tracking-widest uppercase hover:bg-vintage-amber disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}>
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />{labels.anmelden_lauft}</> : labels.anmelden_btn}
            </button>

            <p className="text-center text-vintage-dust text-xs font-sans">
              <Link href="/kunde/passwort-vergessen" className="hover:text-vintage-cream/80 underline">
                {labels.vergessen}
              </Link>
            </p>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-vintage-dust text-xs font-sans">
            {labels.kein_account}{" "}
            <Link href="/kunde/registrieren" className="text-vintage-cream/80 hover:text-vintage-cream underline">
              {labels.jetzt_register}
            </Link>
          </p>
          <p>
            <Link href="/" className="text-vintage-dust text-xs hover:text-vintage-cream/80 transition-colors">
              ← {labels.zur_hauptseite}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
