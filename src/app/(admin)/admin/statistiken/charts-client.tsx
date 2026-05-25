"use client";

import { TimelineChart }    from "@/components/charts/timeline-chart";
import { PieChartVintage }  from "@/components/charts/pie-chart-vintage";
import { BarChartVintage }  from "@/components/charts/bar-chart-vintage";
import { formatPreis } from "@/lib/utils/preis";
import { TrendingUp } from "lucide-react";

interface TimelineEintrag { datum: string; anzahl: number; }
interface KategorieEintrag { name: string; anzahl: number; wert: number; }
interface ZustandEintrag  { zustand: string; anzahl: number; }

const ZUSTAND_LABELS: Record<string, string> = {
  sehr_gut:    "Отличное",
  gut:         "Хорошее",
  akzeptabel:  "Приемлемое",
  restauriert: "Реставрировано",
};

interface Props {
  timeline:   TimelineEintrag[];
  kategorien: KategorieEintrag[];
  zustand:    ZustandEintrag[];
}

export function StatistikCharts({ timeline, kategorien, zustand }: Props) {
  return (
    <>
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-vintage-espresso">Новые товары — последние 30 дней</h2>
          <TrendingUp className="w-4 h-4 text-vintage-gold" />
        </div>
        {timeline.length > 0 ? (
          <TimelineChart data={timeline} label="Новые товары" />
        ) : (
          <div className="py-12 text-center text-vintage-dust text-sm font-sans">Нет данных</div>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Распределение по категориям</h2>
          {kategorien.length > 0 ? (
            <PieChartVintage
              data={kategorien.slice(0, 8).map(k => ({ name: k.name, value: k.anzahl }))}
              label="товаров"
              donut
            />
          ) : (
            <div className="py-12 text-center text-vintage-dust text-sm font-sans">Нет категорий</div>
          )}
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Состояние</h2>
          {zustand.length > 0 ? (
            <BarChartVintage
              data={zustand.map(z => ({
                name: ZUSTAND_LABELS[z.zustand] ?? z.zustand,
                wert: z.anzahl,
              }))}
              label="товаров"
            />
          ) : (
            <div className="py-12 text-center text-vintage-dust text-sm font-sans">Нет данных</div>
          )}
        </section>
      </div>

      {kategorien.length > 0 && (
        <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Стоимость инвентаря по категориям</h2>
          <BarChartVintage
            data={kategorien.map(k => ({ name: k.name, wert: Math.round(k.wert) }))}
            label="₸"
            horizontal
            einfarbig
            formatter={(v) => formatPreis(v)}
          />
        </section>
      )}
    </>
  );
}
