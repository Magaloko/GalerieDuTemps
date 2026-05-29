"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import type { Dictionary } from "@/i18n";
import type { Kategorie } from "@/types/produkt";

type Nav = { href: string; label: string; badge?: string };

type MobileDrawerProps = {
  open:        boolean;
  onClose:     () => void;
  t:           Dictionary;
  navLinks:    Nav[];
  kategorien?: Kategorie[];
  wunschCount: number;
};

/* ──────────────────────────────────────────────────────────────────────────
 * MobileDrawer — Handoff H1.
 * 85% Width, slide-in von links über dim-Layer.
 * Cobalt-BG. Top: wordmark + close. Account-Row. Nav-Liste mit Display-Type.
 * Footer pinned bottom: Sprache + Sozial-Icons.
 * ────────────────────────────────────────────────────────────────────────── */
export function MobileDrawer({
  open, onClose, t, navLinks, kategorien = [], wunschCount,
}: MobileDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
      {/* Dim layer */}
      <button
        type="button"
        aria-label="Закрыть меню"
        className="absolute inset-0"
        style={{ background: "rgba(15,20,48,0.45)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute left-0 top-0 bottom-0 flex flex-col"
        style={{
          width:      "85%",
          maxWidth:   360,
          background: "var(--color-cobalt)",
          padding:    "60px 24px 28px",
        }}
      >
        {/* Top: Wordmark + close */}
        <div className="flex items-center justify-between mb-8">
          <Wordmark size={28} stack={false} />
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-coral transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account row */}
        <Link
          href="/kunde"
          className="flex items-center gap-3 pb-6 mb-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <span
            className="flex items-center justify-center"
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "var(--color-coral)",
              color: "var(--color-cobalt)",
              fontFamily: "var(--font-display)",
              fontSize: 16,
            }}
          >
            G
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-medium" style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}>
              {/* TODO i18n: nav.kunde_account */}
              Аккаунт
            </p>
            <p className="text-white/90 text-sm truncate" style={{ fontFamily: "var(--font-italic)", fontStyle: "italic" }}>
              {t.nav.anmelden}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/40" />
        </Link>

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navLinks.map(({ href, label, badge }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between py-3"
                    onClick={onClose}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize:   active ? 28 : 22,
                        color:      active ? "var(--color-coral)" : "rgba(255,255,255,0.95)",
                        lineHeight: 1.1,
                      }}
                    >
                      {label}
                    </span>
                    {badge && (
                      <span
                        className="text-[10px]"
                        style={{
                          fontFamily:    "var(--font-mono)",
                          letterSpacing: "0.2em",
                          color:         "var(--color-coral)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

            <li>
              <Link
                href="/wunschliste"
                className="flex items-center justify-between py-3"
                onClick={onClose}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   22,
                    color:      "rgba(255,255,255,0.95)",
                  }}
                >
                  {t.nav.wunschliste}
                </span>
                {wunschCount > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5"
                    style={{
                      fontFamily:    "var(--font-mono)",
                      letterSpacing: "0.18em",
                      background:    "var(--color-coral)",
                      color:         "#fff",
                    }}
                  >
                    {wunschCount}
                  </span>
                )}
              </Link>
            </li>
          </ul>

          {/* Kategorien-Untergruppe */}
          {kategorien.length > 0 && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] uppercase font-medium mb-3" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>
                {t.nav.kategorien}
              </p>
              <ul className="space-y-2">
                {kategorien.slice(0, 6).map(k => (
                  <li key={k.id}>
                    <Link
                      href={`/kategorien/${k.slug}`}
                      onClick={onClose}
                      className="text-sm flex items-center justify-between"
                      style={{
                        fontFamily: "var(--font-italic)",
                        fontStyle:  "italic",
                        color:      "rgba(255,255,255,0.75)",
                      }}
                    >
                      <span>{k.name}</span>
                      {k.anzahl !== undefined && k.anzahl > 0 && (
                        <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                          {k.anzahl}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

      </div>
    </div>
  );
}
