import Link from "next/link";

type Item = {
  label:  string;
  href:   string;
  count?: number;
  active?: boolean;
};

type FilterGroupProps = {
  title:  string;
  items:  Item[];
  showAllLabel?: string;
  showAllHref?:  string;
  className?:    string;
};

/* ──────────────────────────────────────────────────────────────────────────
 * FilterGroup — Handoff B1 Sidebar-Filter-Block.
 * Titel (small caps eyebrow) + Item-Liste mit rechtsbündigem Count in Mono.
 * Active-Item bekommt Coral-Akzent.
 * ────────────────────────────────────────────────────────────────────────── */
export function FilterGroup({ title, items, showAllLabel, showAllHref, className }: FilterGroupProps) {
  return (
    <div className={`pb-6 ${className ?? ""}`}>
      <p
        className="text-[10px] uppercase font-medium mb-3"
        style={{ letterSpacing: "0.28em", color: "var(--color-ink-soft)" }}
      >
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="flex items-center justify-between text-sm transition-colors"
              style={{
                color:      it.active ? "var(--color-coral)" : "var(--color-ink-soft)",
                fontFamily: it.active ? "var(--font-italic)" : "var(--font-sans)",
                fontStyle:  it.active ? "italic" : "normal",
                fontWeight: it.active ? 500 : 400,
              }}
            >
              <span className="truncate">{it.label}</span>
              {it.count !== undefined && (
                <span
                  className="ml-2 shrink-0"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize:   11,
                    color:      it.active ? "var(--color-coral)" : "var(--color-ink-mute)",
                  }}
                >
                  {it.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {showAllHref && showAllLabel && (
        <Link
          href={showAllHref}
          className="inline-block mt-3 text-[10px] uppercase font-medium hover:opacity-80 transition-opacity"
          style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
        >
          {showAllLabel} →
        </Link>
      )}
    </div>
  );
}
