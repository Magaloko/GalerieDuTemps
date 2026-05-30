import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import {
  preisHistogramm,
  preisStatistikPerKategorie,
  teuersteProdukte,
  guenstigsteProdukte,
} from "@/lib/db/statistiken";
import { BarChartVintage } from "@/components/charts/bar-chart-vintage";
import { formatPreis } from "@/lib/utils/preis";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Анализ цен" };
export const dynamic = "force-dynamic";

export default async function PreisanalysePage() {
  const base = await getModuleBase();
  const [histogramm, statsPerKat, teuer, guenstig] = await Promise.all([
    preisHistogramm().catch(() => []),
    preisStatistikPerKategorie().catch(() => []),
    teuersteProdukte(8).catch(() => []),
    guenstigsteProdukte(8).catch(() => []),
  ]);

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Header */}
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Анализ цен</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Распределение цен, статистика категорий и лидеры
        </p>
      </div>

      {/* Preis-Histogramm */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-serif text-lg text-vintage-espresso">Распределение цен</h2>
            <p className="text-vintage-dust text-xs font-sans mt-0.5">
              Количество товаров по ценовым диапазонам
            </p>
          </div>
          <BarChart3 className="w-4 h-4 text-vintage-gold" />
        </div>
        {histogramm.length > 0 ? (
          <BarChartVintage
            data={histogramm.map(h => ({ name: h.label, wert: h.anzahl }))}
            label="Товары"
            einfarbig
          />
        ) : (
          <div className="py-12 text-center text-vintage-dust text-sm font-sans">
            Нет доступных данных
          </div>
        )}
      </section>

      {/* Stats pro Kategorie als Tabelle */}
      <section
        className="bg-vintage-white border border-vintage-sand overflow-hidden"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="px-6 py-5 border-b border-vintage-sand">
          <h2 className="font-serif text-lg text-vintage-espresso">
            Статистика по категориям
          </h2>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Минимум, максимум, среднее и медиана по категориям
          </p>
        </div>

        {statsPerKat.length === 0 ? (
          <div className="py-12 text-center text-vintage-dust text-sm font-sans">
            Нет данных
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-vintage-sand bg-vintage-parchment/50">
                  <th className="text-left  px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Категория</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Количество</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Min</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Max</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Median</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Ø цена</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {statsPerKat.map(s => (
                  <tr key={s.kategorie} className="hover:bg-vintage-parchment/30 transition-colors">
                    <td className="px-5 py-3 text-vintage-ink">{s.kategorie}</td>
                    <td className="px-5 py-3 text-right text-vintage-dust">{s.anzahl}</td>
                    <td className="px-5 py-3 text-right font-serif text-vintage-espresso">{formatPreis(s.min)}</td>
                    <td className="px-5 py-3 text-right font-serif text-vintage-espresso">{formatPreis(s.max)}</td>
                    <td className="px-5 py-3 text-right font-serif text-vintage-brown">{formatPreis(s.median)}</td>
                    <td className="px-5 py-3 text-right font-serif text-vintage-gold">{formatPreis(s.durchschnitt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top + Flop */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Teuerste */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-vintage-burgundy" />
            <h2 className="font-serif text-lg text-vintage-espresso">Самые дорогие товары</h2>
          </div>
          {teuer.length === 0 ? (
            <p className="text-vintage-dust text-sm font-sans text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-1.5">
              {teuer.map((p, i) => (
                <Link
                  key={p.id}
                  href={`${base}/produkte/${p.id}`}
                  className="flex items-center justify-between p-3 border border-vintage-sand/60 hover:bg-vintage-parchment/40 transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-vintage-gold font-serif text-sm w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-vintage-ink truncate">{p.name}</p>
                      {p.kategorie_name && (
                        <p className="text-xs text-vintage-dust">{p.kategorie_name}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-serif text-vintage-espresso flex-shrink-0">{formatPreis(p.preis)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Günstigste */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown className="w-4 h-4 text-vintage-sage" />
            <h2 className="font-serif text-lg text-vintage-espresso">Самые недорогие товары</h2>
          </div>
          {guenstig.length === 0 ? (
            <p className="text-vintage-dust text-sm font-sans text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-1.5">
              {guenstig.map((p, i) => (
                <Link
                  key={p.id}
                  href={`${base}/produkte/${p.id}`}
                  className="flex items-center justify-between p-3 border border-vintage-sand/60 hover:bg-vintage-parchment/40 transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-vintage-sage font-serif text-sm w-5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-vintage-ink truncate">{p.name}</p>
                      {p.kategorie_name && (
                        <p className="text-xs text-vintage-dust">{p.kategorie_name}</p>
                      )}
                    </div>
                  </div>
                  <p className="font-serif text-vintage-espresso flex-shrink-0">{formatPreis(p.preis)}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
