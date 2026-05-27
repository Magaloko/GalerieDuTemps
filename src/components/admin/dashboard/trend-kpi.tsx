import Link from "next/link";
import { ArrowUp, ArrowDown, Minus, ArrowUpRight } from "lucide-react";
import type { TrendVergleich } from "@/lib/db/dashboard-v2";

/**
 * TrendKpi — Große KPI-Card mit Trend-Indikator (vs Vortag/Vorwoche/Vormonat)
 *
 * Layout:
 *   ┌────────────────────────────┐
 *   │ ВЫРУЧКА СЕГОДНЯ      ↗︎   │
 *   │ 12 500 ₸                  │
 *   │ ↑ 18% vs gestern (10 580) │
 *   └────────────────────────────┘
 */

interface Props {
  label:       string;
  value:       string;
  trend:       TrendVergleich;
  /** Label für die Vergleichsperiode: "vs gestern" | "vs vorwoche" | "vs vormonat" */
  vergleich:   string;
  /** Formatierungs-Fn für previous-Wert in Trend-Description */
  formatVergleich?: (n: number) => string;
  icon?:       React.ElementType;
  href?:       string;
}

export function TrendKpi({ label, value, trend, vergleich, formatVergleich, icon: Icon, href }: Props) {
  const trendStyle = {
    up:   { color: "#7A8B6F", bg: "rgba(127,140,90,0.10)", IconCmp: ArrowUp },
    down: { color: "#A53E26", bg: "rgba(232,112,58,0.10)", IconCmp: ArrowDown },
    flat: { color: "var(--color-ink-mute)", bg: "rgba(155,155,155,0.10)", IconCmp: Minus },
  }[trend.richtung];

  const TrendIcon = trendStyle.IconCmp;
  const arrow = trend.prozent > 0 ? `+${trend.prozent}%` : `${trend.prozent}%`;
  const vergleichWert = formatVergleich ? formatVergleich(trend.previous) : String(trend.previous);

  const card = (
    <div
      className="group p-5 transition-shadow hover:shadow-[0_2px_12px_rgba(15,20,48,0.08)]"
      style={{
        background:   "#fff",
        border:       "1px solid var(--color-line)",
        borderRadius: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p
          className="text-[10px] uppercase font-medium flex items-center gap-1.5"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
        >
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />}
          {label}
        </p>
        {href && (
          <ArrowUpRight
            className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
            style={{ color: "var(--color-coral)" }}
          />
        )}
      </div>

      {/* Value */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   28,
          color:      "var(--color-ink)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>

      {/* Trend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-mono"
          style={{
            background:   trendStyle.bg,
            color:        trendStyle.color,
            borderRadius: "var(--radius-vintage)",
          }}
        >
          <TrendIcon className="w-2.5 h-2.5" />
          {trend.richtung === "flat" ? "≈" : arrow}
        </span>
        <span
          className="text-[11px]"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-mute)",
          }}
        >
          {vergleich} ({vergleichWert})
        </span>
      </div>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
