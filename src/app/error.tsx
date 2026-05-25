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
    <div className="min-h-screen flex items-center justify-center bg-vintage-espresso texture-paper px-4 py-20">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 mb-6"
             style={{ borderRadius: "50%" }}>
          <AlertCircle className="w-8 h-8 text-vintage-burgundy" />
        </div>

        <p className="text-vintage-gold text-sm tracking-widest mb-2">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream mb-3">
          Что-то пошло не так
        </h1>
        <p className="text-vintage-dust text-sm font-sans mb-8 leading-relaxed">
          Произошла непредвиденная ошибка. Попробуйте ещё раз
          или вернитесь на главную.
        </p>

        {error.digest && (
          <p className="text-xs text-vintage-dust font-mono mb-6">
            ID ошибки: {error.digest}
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
            Повторить
          </button>
          <Link
            href="/"
            className="
              inline-flex items-center justify-center gap-2
              px-6 py-3 border border-vintage-sand/40 text-vintage-cream/80
              font-sans text-xs tracking-widest uppercase
              hover:bg-vintage-brown/40 transition-colors
            "
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <Home className="w-4 h-4" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
