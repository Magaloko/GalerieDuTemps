"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FormSectionProps {
  title:        string;
  /** Optionales Icon links vom Titel. */
  icon?:        React.ReactNode;
  /** Optionaler Hinweis-Text rechts neben dem Titel (z.B. „Опционально"). */
  hint?:        React.ReactNode;
  /** Wenn true: Header wird zum Toggle, Sektion lässt sich ein-/ausklappen. */
  collapsible?: boolean;
  /** Initialer Zustand bei collapsible. Default: true (offen). */
  defaultOpen?: boolean;
  children:     React.ReactNode;
}

/**
 * FormSection — einheitlicher Karten-Wrapper für die Sektionen des
 * Produkt-Formulars (weiße Karte, Serifen-Header, optionales Icon + Hinweis).
 *
 * `collapsible` macht den Header zum Toggle für optionale/erweiterte Blöcke.
 *
 * WICHTIG — eingeklappte Inhalte bleiben via `display:none` im DOM (statt
 * unmounted). Dadurch werden ihre Formularfelder beim Absenden trotzdem
 * mitgesendet; conditional rendering (`{open && …}`) würde sie aus dem
 * FormData entfernen → Datenverlust beim Speichern.
 */
export function FormSection({
  title,
  icon,
  hint,
  collapsible = false,
  defaultOpen = true,
  children,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  const headerInner = (
    <>
      <h2
        className="font-serif text-lg flex items-center gap-2 min-w-0"
        style={{ color: "var(--color-ink)" }}
      >
        {icon}
        <span className="truncate">{title}</span>
      </h2>
      <span className="flex items-center gap-3 shrink-0">
        {hint != null && (
          <span className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>
            {hint}
          </span>
        )}
        {collapsible && (
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{
              color: "var(--color-ink-mute)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        )}
      </span>
    </>
  );

  const headerClass = `flex items-center justify-between gap-3 ${
    isOpen ? "pb-3 border-b" : ""
  }`;
  const headerStyle = isOpen
    ? { borderBottomColor: "var(--color-line)" }
    : undefined;

  return (
    <section
      className="p-6"
      style={{
        background: "var(--color-app-surface)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-app)",
      }}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={isOpen}
          className={`w-full text-left transition-colors hover:opacity-90 ${headerClass}`}
          style={headerStyle}
        >
          {headerInner}
        </button>
      ) : (
        <div className={headerClass} style={headerStyle}>
          {headerInner}
        </div>
      )}

      <div className="pt-5 space-y-5" style={{ display: isOpen ? undefined : "none" }}>
        {children}
      </div>
    </section>
  );
}
