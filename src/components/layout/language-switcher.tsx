"use client";

import { useState, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { LOCALE_INFO, type Locale } from "@/i18n/types";

const VERFUEGBARE: Locale[] = ["ru", "kz", "en"];

export function LanguageSwitcher({ ariaLabel }: { ariaLabel?: string } = {}) {
  const [aktiv, setAktiv] = useState(false);
  const [current, setCurrent] = useState<Locale>("ru");

  useEffect(() => {
    // Aus Cookie lesen
    const m = document.cookie.match(/vm_locale=(ru|kz|en|de)/);
    if (m) setCurrent(m[1] as Locale);
  }, []);

  const wechsle = (loc: Locale) => {
    document.cookie = `vm_locale=${loc}; max-age=${365*24*60*60}; path=/; SameSite=Lax`;
    setCurrent(loc);
    window.location.reload();
  };

  const info = LOCALE_INFO[current];

  return (
    <div className="relative">
      <button
        onClick={() => setAktiv(a => !a)}
        className="flex items-center gap-1.5 p-2 text-vintage-dust hover:text-vintage-espresso hover:bg-vintage-parchment transition-colors"
        style={{ borderRadius: "var(--radius-card)" }}
        aria-label={ariaLabel ?? "Sprache wechseln"}
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-sans uppercase tracking-widest">{info.code}</span>
      </button>

      {aktiv && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAktiv(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-40 bg-vintage-white border border-vintage-sand min-w-40 py-1"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-md)" }}
          >
            {VERFUEGBARE.map(loc => {
              const inf = LOCALE_INFO[loc];
              return (
                <button
                  key={loc}
                  onClick={() => wechsle(loc)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-sans text-vintage-ink hover:bg-vintage-parchment transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{inf.flag}</span>
                    {inf.name}
                  </span>
                  {current === loc && <Check className="w-3.5 h-3.5 text-vintage-gold" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
