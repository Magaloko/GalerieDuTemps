"use client";

import { useState, useEffect } from "react";
import { Globe, Check, X } from "lucide-react";
import { LOCALE_INFO, type Locale } from "@/i18n/types";

const VERFUEGBARE: Locale[] = ["ru", "kz", "en"];

/* ──────────────────────────────────────────────────────────────────────────
 * LanguageSwitcher
 *
 * Desktop: Trigger-Button + absolute Dropdown (right-anchored).
 * Mobile (< md): Trigger-Button + fullscreen-Modal mit großen Buttons —
 * weil:
 *  a) Absolute Dropdown an rechtem Bildschirmrand würde teils off-screen
 *     rendern (Trigger sitzt oft ganz rechts in der Promo-Bar).
 *  b) Touch-Targets im absolute Dropdown wären zu klein für Mobile-Tap.
 *  c) Modal-Pattern ist Mobile-Standard für „pick from a list".
 * ────────────────────────────────────────────────────────────────────────── */
export function LanguageSwitcher({ ariaLabel }: { ariaLabel?: string } = {}) {
  const [aktiv, setAktiv] = useState(false);
  const [current, setCurrent] = useState<Locale>("ru");

  useEffect(() => {
    const m = document.cookie.match(/vm_locale=(ru|kz|en|de)/);
    if (m) setCurrent(m[1] as Locale);
  }, []);

  // ESC schließt Modal
  useEffect(() => {
    if (!aktiv) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setAktiv(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [aktiv]);

  const wechsle = (loc: Locale) => {
    document.cookie = `vm_locale=${loc}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Lax`;
    setCurrent(loc);
    window.location.reload();
  };

  const info = LOCALE_INFO[current];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAktiv(a => !a)}
        className="flex items-center gap-1.5 p-2 transition-colors hover:opacity-80"
        style={{
          color:                   "currentColor",
          touchAction:             "manipulation",
          WebkitTapHighlightColor: "rgba(232,112,58,0.25)",
          minHeight:               40,
          minWidth:                40,
          borderRadius:            "var(--radius-card)",
        }}
        aria-label={ariaLabel ?? "Сменить язык"}
        aria-expanded={aktiv}
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-medium uppercase" style={{ letterSpacing: "0.18em" }}>
          {info.code}
        </span>
      </button>

      {aktiv && (
        <>
          {/* ── Desktop-Dropdown (>= md) ──────────────────────────── */}
          <div
            className="hidden md:block fixed inset-0 z-30"
            onClick={() => setAktiv(false)}
            aria-hidden
          />
          <div
            className="hidden md:block absolute right-0 top-full mt-1 z-40 min-w-44 py-1"
            style={{
              background:   "#fff",
              border:       "1px solid var(--color-line)",
              boxShadow:    "var(--shadow-soft)",
              borderRadius: 0,
            }}
          >
            {VERFUEGBARE.map(loc => {
              const inf = LOCALE_INFO[loc];
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => wechsle(loc)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-bone"
                  style={{
                    color: "var(--color-ink)",
                    touchAction: "manipulation",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{inf.flag}</span>
                    {inf.name}
                  </span>
                  {current === loc && <Check className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />}
                </button>
              );
            })}
          </div>

          {/* ── Mobile-Modal (< md) — Bottom-Sheet ────────────────── */}
          <div
            className="md:hidden fixed inset-0 z-[70] flex items-end"
            role="dialog"
            aria-modal="true"
            aria-label="Выбор языка"
          >
            {/* Dim-Layer */}
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => setAktiv(false)}
              className="absolute inset-0"
              style={{ background: "rgba(15, 20, 48, 0.55)" }}
            />

            {/* Sheet */}
            <div
              className="relative w-full"
              style={{
                background:    "#fff",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
                animation:     "gdt-sheet-up 200ms ease-out",
              }}
            >
              <style>{`
                @keyframes gdt-sheet-up {
                  from { transform: translateY(100%); }
                  to   { transform: translateY(0); }
                }
              `}</style>

              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--color-line)" }}
              >
                <p
                  className="text-[12px] uppercase font-medium"
                  style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
                >
                  <Globe className="inline w-3.5 h-3.5 mr-1.5" />
                  Выбор языка
                </p>
                <button
                  type="button"
                  onClick={() => setAktiv(false)}
                  aria-label="Закрыть"
                  className="p-2 -mr-2"
                  style={{
                    color:                   "var(--color-ink-soft)",
                    touchAction:             "manipulation",
                    WebkitTapHighlightColor: "rgba(232,112,58,0.25)",
                    minHeight:               44,
                    minWidth:                44,
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Options — große Touch-Targets */}
              <ul>
                {VERFUEGBARE.map(loc => {
                  const inf = LOCALE_INFO[loc];
                  const isCurrent = current === loc;
                  return (
                    <li key={loc}>
                      <button
                        type="button"
                        onClick={() => wechsle(loc)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
                        style={{
                          color:                   "var(--color-ink)",
                          background:              isCurrent ? "rgba(232,112,58,0.06)" : "transparent",
                          borderBottom:            "1px solid var(--color-line)",
                          touchAction:             "manipulation",
                          WebkitTapHighlightColor: "rgba(232,112,58,0.2)",
                          minHeight:               56,
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-2xl" aria-hidden>{inf.flag}</span>
                          <span>
                            <span
                              className="block"
                              style={{
                                fontFamily: "var(--font-display)",
                                fontSize:   18,
                                color:      "var(--color-ink)",
                              }}
                            >
                              {inf.name}
                            </span>
                            <span
                              className="block text-[11px] uppercase mt-0.5"
                              style={{
                                letterSpacing: "0.22em",
                                color:         "var(--color-ink-mute)",
                              }}
                            >
                              {inf.code}
                            </span>
                          </span>
                        </span>
                        {isCurrent && (
                          <span
                            className="flex items-center justify-center"
                            style={{
                              width:        28,
                              height:       28,
                              background:   "var(--color-coral)",
                              color:        "#fff",
                              borderRadius: "50%",
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
