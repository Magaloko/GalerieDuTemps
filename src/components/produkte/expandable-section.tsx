"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title:        string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
  /** Optionaler Badge rechts neben dem Title (z.B. Anzahl der Items) */
  badge?:       React.ReactNode;
}

/**
 * ExpandableSection — Accordion-Style Block für Produkt-Detail-Page.
 *
 * Konsistent: alle Sections haben oben einen klickbaren Header,
 * Chevron rotiert beim Öffnen, dezenter Unterstrich zwischen Sections.
 */
export function ExpandableSection({ title, children, defaultOpen = false, badge }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: "1px solid var(--color-line, rgba(176,141,87,0.15))" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left transition-colors hover:opacity-90"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <h3
            className="font-display"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   18,
              color:      "var(--color-ink, #2C2420)",
            }}
          >
            {title}
          </h3>
          {badge != null && (
            <span
              className="px-2 py-0.5 text-[10px] font-medium uppercase"
              style={{
                background:    "var(--color-bone, #F5F0E8)",
                color:         "var(--color-ink-mute, #9B9B9B)",
                letterSpacing: "0.18em",
                borderRadius:  "var(--radius-vintage)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className="transition-transform shrink-0"
          style={{
            color:     "var(--color-ink-mute, rgba(44,36,32,0.4))",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div className="pb-5">
          {children}
        </div>
      )}
    </div>
  );
}
