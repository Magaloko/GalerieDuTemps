import {
  uebersichtStats,
  produktTimeline,
  kategorieVerteilung,
  zustandVerteilung,
} from "@/lib/db/statistiken";
import { TimelineChart }    from "@/components/charts/timeline-chart";
import { PieChartVintage }  from "@/components/charts/pie-chart-vintage";
import { BarChartVintage }  from "@/components/charts/bar-chart-vintage";
import { formatPreis } from "@/lib/utils/preis";
import {
  Package,
  ShoppingBag,
  Mail,
  Heart,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Statistiken" };
export const dynamic = "force-dynamic";

const ZUSTAND_LABELS: Record<string, string> = {
  sehr_gut:    "Sehr gut",
  gut:         "Gut",
  akzeptabel:  "Akzeptabel",
  restauriert: "Restauriert",
};

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
  const [stats, timeline, kategorien, zustand] = await Promise.all([
    uebersichtStats().catch(() => null),
    produktTimeline(30).catch(() => []),
    kategorieVerteilung().catch(() => []),
    zustandVerteilung().catch(() => []),
  ]);

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Header */}
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Statistiken</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Übersicht über dein Inventar und deine Performance
        </p>
      </div>

      {/* Mini-Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat label="Gesamt"      wert={stats.produkte_gesamt}     icon={Package}    />
          <MiniStat label="Verfügbar"   wert={stats.produkte_verfuegbar} icon={ShoppingBag}/>
          <MiniStat label="Verkauft"    wert={stats.produkte_verkauft}   icon={ShoppingBag}/>
          <MiniStat label="Featured"    wert={stats.produkte_featured}   icon={Sparkles}   />
          <MiniStat label="Kontakte"    wert={stats.kontakt_gesamt}      icon={Mail}       />
          <MiniStat label="Wunschliste" wert={stats.wunschliste_user}    icon={Heart}      />
        </div>
      )}

      {/* Inventar-Wert */}
      {stats && (
        <div
          className="bg-vintage-espresso text-vintage-cream p-8 grid md:grid-cols-3 gap-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Gesamtwert</p>
            <p className="font-serif text-3xl">{formatPreis(stats.gesamtwert)}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Aller verfügbaren Artikel</p>
          </div>
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Durchschnittspreis</p>
            <p className="font-serif text-3xl">{formatPreis(stats.durchschnittspreis)}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Pro Stück</p>
          </div>
          <div>
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Kategorien</p>
            <p className="font-serif text-3xl">{stats.kategorien}</p>
            <p className="text-vintage-cream/60 text-xs mt-1 font-sans">Aktiv im System</p>
          </div>
        </div>
      )}

      {/* Charts Row 1: Timeline */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-vintage-espresso">
            Neue Produkte – letzte 30 Tage
          </h2>
          <TrendingUp className="w-4 h-4 text-vintage-gold" />
        </div>
        {timeline.length > 0 ? (
          <TimelineChart data={timeline} label="Neue Produkte" />
        ) : (
          <div className="py-12 text-center text-vintage-dust text-sm font-sans">Keine Daten verfügbar</div>
        )}
      </section>

      {/* Charts Row 2: Pie + Bar */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Kategorien-Pie */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Verteilung nach Kategorie</h2>
          {kategorien.length > 0 ? (
            <PieChartVintage
              data={kategorien.slice(0, 8).map(k => ({ name: k.name, value: k.anzahl }))}
              label="Produkte"
              donut
            />
          ) : (
            <div className="py-12 text-center text-vintage-dust text-sm font-sans">Keine Kategorien</div>
          )}
        </section>

        {/* Zustand-Bar */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Zustand-Verteilung</h2>
          {zustand.length > 0 ? (
            <BarChartVintage
              data={zustand.map(z => ({
                name: ZUSTAND_LABELS[z.zustand] ?? z.zustand,
                wert: z.anzahl,
              }))}
              label="Produkte"
            />
          ) : (
            <div className="py-12 text-center text-vintage-dust text-sm font-sans">Keine Daten</div>
          )}
        </section>
      </div>

      {/* Inventar-Wert pro Kategorie */}
      {kategorien.length > 0 && (
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso mb-5">Inventar-Wert pro Kategorie</h2>
          <BarChartVintage
            data={kategorien.map(k => ({ name: k.name, wert: Math.round(k.wert) }))}
            label="EUR"
            horizontal
            einfarbig
            formatter={(v) => formatPreis(v)}
          />
        </section>
      )}
    </div>
  );
}
