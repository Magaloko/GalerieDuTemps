import {
  uebersichtStats,
  produktTimeline,
  kategorieVerteilung,
  zustandVerteilung,
} from "@/lib/db/statistiken";
import { StatistikCharts } from "./charts-client";
import { formatPreis } from "@/lib/utils/preis";
import {
  Package,
  ShoppingBag,
  Mail,
  Heart,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Статистика" };
export const dynamic = "force-dynamic";

function MiniStat({
  label, wert, icon: Icon,
}: { label: string; wert: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-vintage-gold" />
        <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust">{label}</p>
      </div>
      <p className="font-serif text-2xl text-vintage-espresso">{wert}</p>
    </div>
  );
}

export default async function StatistikenPage() {
  // allSettled: einzelne Query-Fehler reißen die ganze Seite nicht ab
  const results = await Promise.allSettled([
    uebersichtStats(),
    produktTimeline(30),
    kategorieVerteilung(),
    zustandVerteilung(),
  ]);

  const stats      = results[0].status === "fulfilled" ? results[0].value : null;
  const timeline   = results[1].status === "fulfilled" ? results[1].value : [];
  const kategorien = results[2].status === "fulfilled" ? results[2].value : [];
  const zustand    = results[3].status === "fulfilled" ? results[3].value : [];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Статистика</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Обзор инвентаря и эффективности
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="Всего"        wert={stats.produkte_gesamt}     icon={Package}     />
          <MiniStat label="Активны"      wert={stats.produkte_verfuegbar} icon={ShoppingBag} />
          <MiniStat label="Продано"      wert={stats.produkte_verkauft}   icon={ShoppingBag} />
          <MiniStat label="Избранные"    wert={stats.produkte_featured}   icon={Sparkles}    />
          <MiniStat label="Контакты"     wert={stats.kontakt_gesamt}      icon={Mail}        />
          <MiniStat label="Избранное"    wert={stats.wunschliste_user}    icon={Heart}       />
        </div>
      )}

      {stats && (
        <div
          className="bg-vintage-espresso text-vintage-cream p-8 grid md:grid-cols-3 gap-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Стоимость инвентаря</p>
            <p className="font-serif text-3xl">{formatPreis(stats.gesamtwert)}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Всех доступных товаров</p>
          </div>
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Средняя цена</p>
            <p className="font-serif text-3xl">{formatPreis(stats.durchschnittspreis)}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">За единицу</p>
          </div>
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Категории</p>
            <p className="font-serif text-3xl">{stats.kategorien}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Активные в системе</p>
          </div>
        </div>
      )}

      <StatistikCharts
        timeline={timeline}
        kategorien={kategorien}
        zustand={zustand}
      />
    </div>
  );
}
