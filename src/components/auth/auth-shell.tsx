import { Hourglass } from "@/components/brand/hourglass";

/* ──────────────────────────────────────────────────────────────────────────
 * AuthShell — geteilter Layout-Container für alle Auth-Pages.
 *
 * Verwendet auf:
 *   /login                          (Admin)
 *   /kunde/anmelden                 (Customer-Login)
 *   /kunde/registrieren             (Customer-Register)
 *   /kunde/registrieren/erfolg
 *   /kunde/passwort-vergessen
 *   /kunde/passwort-neu
 *   /kunde/bestaetigt
 *   /affiliate/anmelden             (optional, kommt später)
 *   /affiliate/registrieren
 *
 * Struktur:
 *   ┌────────────────────────────────────┐
 *   │ Paper-BG, vertikal zentriert       │
 *   │ ┌──── max-w-sm/md ────┐           │
 *   │ │ Hero: ⧖ GALERIE     │           │
 *   │ │       du Temps      │           │
 *   │ │       EYEBROW       │           │
 *   │ │                     │           │
 *   │ │ ┌─ Card ──────────┐ │           │
 *   │ │ │  H1 + children  │ │           │
 *   │ │ └─────────────────┘ │           │
 *   │ │ Footer (© / link)   │           │
 *   │ └─────────────────────┘           │
 *   └────────────────────────────────────┘
 *
 * Server-Component (kein "use client"); Forms inside sind client.
 * ────────────────────────────────────────────────────────────────────────── */

interface Props {
  /** Kleiner Untertitel über dem Logo, z.B. "Мой кабинет" oder "Admin" */
  eyebrow:   string;
  /** Card-Titel (großer Display-Font), z.B. "Вход", "Регистрация" */
  titel:     string;
  /** Card-Inhalt — Form, Success-State, Fehler-State */
  children:  React.ReactNode;
  /** Optionaler Inhalt unter der Card — Links wie „Уже есть аккаунт? Войти" */
  footer?:   React.ReactNode;
  /** Card-Breite: "narrow" für Login (max-w-sm), "wide" für Register (max-w-xl) */
  size?:     "narrow" | "wide";
}

export function AuthShell({
  eyebrow, titel, children, footer, size = "narrow",
}: Props) {
  const maxW = size === "wide" ? "max-w-xl" : "max-w-sm";

  return (
    <main
      className="min-h-[100dvh] flex items-center justify-center px-4 py-12"
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
    >
      <div className={`w-full ${maxW}`}>

        {/* ─── Hero / Brand-Block ─────────────────────────── */}
        <div className="text-center mb-10">
          <Hourglass size={40} className="text-coral mx-auto mb-4" />
          <div
            className="wordmark mb-1"
            style={{ fontSize: 28, color: "var(--color-ink)", lineHeight: 1 }}
          >
            GALERIE
          </div>
          <div
            className="wordmark-italic"
            style={{ fontSize: 14, color: "var(--color-ink-soft)" }}
          >
            du Temps
          </div>
          <p
            className="mt-4 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            {eyebrow}
          </p>
        </div>

        {/* ─── Card ───────────────────────────────────────── */}
        <div
          style={{
            background: "#fff",
            border:     "1px solid var(--color-line)",
            padding:    "32px 28px",
          }}
        >
          <h1
            className="text-center mb-7"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   28,
              color:      "var(--color-ink)",
              lineHeight: 1.1,
            }}
          >
            {titel}
          </h1>
          {children}
        </div>

        {/* ─── Footer (optional Links + Copyright) ───────── */}
        {footer && (
          <div className="text-center mt-6 space-y-3">
            {footer}
          </div>
        )}

        <p
          className="text-center mt-6 text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          © {new Date().getFullYear()} Galerie du Temps
        </p>
      </div>
    </main>
  );
}
