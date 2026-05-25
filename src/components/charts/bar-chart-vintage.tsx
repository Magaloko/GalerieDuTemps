"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { VINTAGE_COLORS, CHART_PALETTE, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE } from "./vintage-theme";

interface BarDaten {
  name:   string;
  wert:   number;
}

interface BarChartVintageProps {
  data:        BarDaten[];
  label?:      string;
  horizontal?: boolean;
  einfarbig?:  boolean;
  formatter?:  (v: number) => string;
}

export function BarChartVintage({
  data,
  label      = "Wert",
  horizontal = false,
  einfarbig  = false,
  formatter,
}: BarChartVintageProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 10, right: 10, left: horizontal ? 80 : -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={VINTAGE_COLORS.sand} opacity={0.4} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={CHART_AXIS_STYLE} axisLine={{ stroke: VINTAGE_COLORS.sand }} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={CHART_AXIS_STYLE} axisLine={{ stroke: VINTAGE_COLORS.sand }} tickLine={false} width={75} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={CHART_AXIS_STYLE} axisLine={{ stroke: VINTAGE_COLORS.sand }} tickLine={false} />
            <YAxis tick={CHART_AXIS_STYLE} axisLine={{ stroke: VINTAGE_COLORS.sand }} tickLine={false} allowDecimals={false} />
          </>
        )}
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(v) => {
            const num = typeof v === "number" ? v : Number(v ?? 0);
            return [formatter ? formatter(num) : num, label];
          }}
          cursor={{ fill: VINTAGE_COLORS.parchment, opacity: 0.4 }}
        />
        <Bar dataKey="wert" radius={[3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={einfarbig ? VINTAGE_COLORS.primary : CHART_PALETTE[i % CHART_PALETTE.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
