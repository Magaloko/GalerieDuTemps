import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import type { AktionsItem } from "@/lib/db/dashboard-v2";

/**
 * ActionBar — "Was muss heute passieren?" Sektion oben im Dashboard.
 *
 * Zeigt 1-5 priorisierte Action-Items mit Urgency-Indikator:
 *   - critical (rot)  → unmittelbares Handeln nötig
 *   - warn (gold)     → bald angehen
 *   - info (cobalt)   → wenn Zeit ist
 *
 * Wenn keine Items: "Все в порядке" mit grünem Häkchen.
 */
export function ActionBar({ items }: { items: AktionsItem[] }) {
  if (items.length === 0) {
    return (
      <div
        className="flex items-center gap-3 p-5"
        style={{
          background:   "rgba(127,140,90,0.08)",
          border:       "1px solid rgba(127,140,90,0.30)",
          borderLeft:   "4px solid #7F8C5A",
          borderRadius: "var(--radius-card)",
        }}
      >
        <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#52663F" }} />
        <div>
          <p
            className="font-serif text-base"
            style={{ color: "#52663F" }}
          >
            Все срочные задачи закрыты.
          </p>
          <p className="text-xs font-sans text-vintage-dust mt-0.5">
            Можно сосредоточиться на новых товарах или контенте.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p
        className="text-[10px] uppercase font-medium px-1 mb-1"
        style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
      >
        ✦ Сегодня важно
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map(item => (
          <ActionCard key={item.schluessel} item={item} />
        ))}
      </div>
    </div>
  );
}

function ActionCard({ item }: { item: AktionsItem }) {
  const style = {
    critical: {
      bg:     "rgba(232,112,58,0.08)",
      border: "rgba(232,112,58,0.45)",
      leftBorder: "var(--color-coral)",
      text:   "#A53E26",
      countBg: "var(--color-coral)",
    },
    warn: {
      bg:     "rgba(201,168,76,0.10)",
      border: "rgba(201,168,76,0.40)",
      leftBorder: "#C9A84C",
      text:   "#8B6F47",
      countBg: "#C9A84C",
    },
    info: {
      bg:     "rgba(15,20,48,0.05)",
      border: "rgba(15,20,48,0.15)",
      leftBorder: "var(--color-cobalt, #1A2342)",
      text:   "var(--color-cobalt, #1A2342)",
      countBg: "var(--color-cobalt, #1A2342)",
    },
  }[item.urgency];

  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 p-3.5 transition-shadow hover:shadow-soft"
      style={{
        background:   style.bg,
        border:       `1px solid ${style.border}`,
        borderLeft:   `3px solid ${style.leftBorder}`,
        borderRadius: "var(--radius-card)",
      }}
    >
      {/* Count badge */}
      <div
        className="shrink-0 w-9 h-9 flex items-center justify-center text-white text-sm font-medium"
        style={{
          background:    style.countBg,
          fontFamily:    "var(--font-display)",
          borderRadius:  "var(--radius-vintage)",
        }}
      >
        {item.count > 99 ? "99+" : item.count}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-sans truncate"
          style={{ color: style.text, fontWeight: 500 }}
        >
          {item.label}
        </p>
      </div>

      {/* Urgency-Icon + Arrow */}
      <div className="shrink-0 flex items-center gap-2">
        {item.urgency === "critical" && (
          <AlertCircle className="w-3.5 h-3.5" style={{ color: style.text }} />
        )}
        <ArrowRight
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: style.text }}
        />
      </div>
    </Link>
  );
}
