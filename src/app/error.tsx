"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, Home, AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-vintage-cream texture-paper px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 mb-6"
             style={{ borderRadius: "50%" }}>
          <AlertCircle className="w-8 h-8 text-vintage-burgundy" />
        </div>

        <p className="text-vintage-gold text-sm tracking-widest mb-2">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso mb-3">
          Etwas ist schiefgegangen
        </h1>
        <p className="text-vintage-dust text-sm font-sans mb-8 leading-relaxed">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut
          oder kehre zur Startseite zurück.
        </p>

        {error.digest && (
          <p className="text-xs text-vintage-dust font-mono mb-6">
            Fehler-ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="
              inline-flex items-center justify-center gap-2
              px-6 py-3 bg-vintage-espresso text-vintage-cream
              font-sans text-xs tracking-widest uppercase
              hover:bg-vintage-brown transition-colors
            "
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <RotateCcw className="w-4 h-4" />
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="
              inline-flex items-center justify-center gap-2
              px-6 py-3 border border-vintage-sand text-vintage-brown
              font-sans text-xs tracking-widest uppercase
              hover:bg-vintage-parchment transition-colors
            "
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <Home className="w-4 h-4" />
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
