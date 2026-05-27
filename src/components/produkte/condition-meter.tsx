import { Award } from "lucide-react";
import type { Zustand } from "@/types/produkt";

/**
 * ConditionMeter — 4-Segmente-Bar die den Zustand visualisiert.
 *
 * Mapping zu sebo.zustand:
 *   restauriert → Level 1 (vintage_character) — brown
 *   akzeptabel  → Level 2 (good)              — amber
 *   gut         → Level 3 (excellent)         — gold
 *   sehr_gut    → Level 4 (new)               — sage
 *
 * Jedes Segment zeigt die "Reise" eines Vintage-Items von gut-gebraucht
 * bis fast-neu. Aktive Segmente in spezifischer Farbe, restliche in dezent grau.
 */

const ZUSTAND_INFO: Record<Zustand, {
  level:  1 | 2 | 3 | 4;
  color:  string;
  label:  string;
  desc:   string;
}> = {
  restauriert: {
    level: 1,
    color: "#8B6F47",
    label: "Реставрировано",
    desc:  "Профессионально восстановлено, со следами времени",
  },
  akzeptabel:  {
    level: 2,
    color: "#C9956B",
    label: "Приемлемое",
    desc:  "Видны следы использования, всё функционально",
  },
  gut:         {
    level: 3,
    color: "#B08D57",
    label: "Хорошее",
    desc:  "Лёгкие следы использования",
  },
  sehr_gut:    {
    level: 4,
    color: "#7A8B6F",
    label: "Отличное",
    desc:  "Минимальные следы, практически идеальное состояние",
  },
};

const SEGMENT_COLORS = ["#8B6F47", "#C9956B", "#B08D57", "#7A8B6F"];

export function ConditionMeter({ zustand }: { zustand: Zustand }) {
  const info = ZUSTAND_INFO[zustand];

  // Fallback wenn DB-Wert nicht in Enum ist (DB-Typ-Drift, manueller SQL)
  if (!info) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Award size={14} style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }} />
          <span className="font-body text-sm" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.5))" }}>
            Состояние: {String(zustand)}
          </span>
        </div>
        <p className="font-body text-[11px]" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }}>
          Подробности уточняйте у продавца
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Award size={14} style={{ color: info.color }} />
        <span className="font-body text-sm font-medium" style={{ color: info.color }}>
          {info.label}
        </span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {SEGMENT_COLORS.map((color, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-sm"
            style={{
              background: i < info.level ? color : "rgba(44, 36, 32, 0.08)",
            }}
          />
        ))}
      </div>
      <p
        className="font-body text-[11px]"
        style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }}
      >
        {info.desc}
      </p>
    </div>
  );
}
