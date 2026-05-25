"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { CHART_PALETTE, CHART_TOOLTIP_STYLE } from "./vintage-theme";

interface PieDaten {
  name:   string;
  value:  number;
}

interface PieChartVintageProps {
  data:    PieDaten[];
  donut?:  boolean;
  label?:  string;
}

export function PieChartVintage({ data, donut = false, label }: PieChartVintageProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={85}
          innerRadius={donut ? 50 : 0}
          paddingAngle={2}
          stroke="#FDFAF5"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(v, n) => [`${v ?? ""} ${label ?? ""}`.trim(), String(n ?? "")]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            fontSize:   "11px",
            fontFamily: "Inter, system-ui, sans-serif",
            color:      "#9B9B9B",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
