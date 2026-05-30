import Link from "next/link";
import { ChevronLeft, ArrowRight, Shield } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * Geteilte UI-Bausteine für die Admin-Mini-App-Seiten.
 * Server-Components — kein "use client". Alle nutzen die tg-theme-Variablen
 * mit Brand-Fallbacks.
 * ────────────────────────────────────────────────────────────────────────── */

export function AdminBack({ href = "/tg/admin", label = "Админ" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 mb-4 text-[11px] uppercase font-medium"
      style={{ letterSpacing: "0.18em", color: "var(--tg-theme-link-color, var(--color-coral))" }}
    >
      <ChevronLeft className="w-3 h-3" /> {label}
    </Link>
  );
}

export function AdminHeader({
  eyebrow, titel, sub,
}: { eyebrow: string; titel: string; sub?: string }) {
  return (
    <header className="mb-5">
      <p
        className="text-[10px] uppercase font-medium mb-1"
        style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
      >
        {eyebrow}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   24,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
          lineHeight: 1.1,
        }}
      >
        {titel}
      </h1>
      {sub && (
        <p
          className="mt-1 text-xs"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          {sub}
        </p>
      )}
    </header>
  );
}

/** Listenkarte mit Link (z.B. Produkt/Kunde in einer Liste). */
export function AdminListRow({
  href, title, sub, right, badge,
}: {
  href:   string;
  title:  string;
  sub?:   string;
  right?: React.ReactNode;
  badge?: { text: string; color: string } | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3"
      style={{
        background:  "var(--tg-theme-section-bg-color, #fff)",
        border:      "1px solid var(--color-line)",
        touchAction: "manipulation",
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-sm truncate"
            style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
          >
            {title}
          </p>
          {badge && (
            <span
              className="text-[9px] uppercase font-medium px-1.5 py-0.5 shrink-0"
              style={{ letterSpacing: "0.16em", background: `${badge.color}22`, color: badge.color }}
            >
              {badge.text}
            </span>
          )}
        </div>
        {sub && (
          <p
            className="text-[11px] mt-0.5 truncate"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right ?? <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />}
    </Link>
  );
}

/** „Nur für Admins"-Fallback (wenn keine admin-webapp-session). */
export function AdminNotAllowed() {
  return (
    <main className="p-6 text-center min-h-[60dvh] flex flex-col items-center justify-center gap-3">
      <Shield className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--tg-theme-text-color, var(--color-ink))" }}>
        Только для администраторов
      </h1>
      <Link href="/tg" className="text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}>
        ← В каталог
      </Link>
    </main>
  );
}

/** Empty-State-Box. */
export function AdminEmpty({ text }: { text: string }) {
  return (
    <div
      className="p-6 text-center"
      style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}
    >
      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
        }}
      >
        {text}
      </p>
    </div>
  );
}
