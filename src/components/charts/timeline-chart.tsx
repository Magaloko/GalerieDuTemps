"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { VINTAGE_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE } from "./vintage-theme";

interface TimelineDaten {
  datum:  string;
  anzahl: number;
}

interface TimelineChartProps {
  data:   TimelineDaten[];
  label?: string;
}

export function TimelineChart({ data, label = "Produkte" }: TimelineChartProps) {
  // Datum formatieren (nur Tag.Monat)
  const formatted = data.map(d => ({
    ...d,
    kurz: new Date(d.datum).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"   stopColor={VINTAGE_COLORS.primary} stopOpacity={0.4} />
            <stop offset="95%"  stopColor={VINTAGE_COLORS.primary} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={VINTAGE_COLORS.sand} opacity={0.4} />
        <XAxis
          dataKey="kurz"
          tick={CHART_AXIS_STYLE}
          axisLine={{ stroke: VINTAGE_COLORS.sand }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_STYLE}
          axisLine={{ stroke: VINTAGE_COLORS.sand }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelFormatter={(v) => `Datum: ${v}`}
          formatter={(v) => [v ?? 0, label]}
        />
        <Area
          type="monotone"
          dataKey="anzahl"
          stroke={VINTAGE_COLORS.primary}
          strokeWidth={2}
          fill="url(#goldGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
