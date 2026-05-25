import { auth } from "@/lib/auth/config";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  Mail,
  Heart,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { uebersichtStats, letzteProdukte } from "@/lib/db/statistiken";
import { formatPreis } from "@/lib/utils/preis";
import { ZustandBadge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  href,
  color = "gold",
}: {
  label:   string;
  value:   string | number;
  icon:    React.ElementType;
  trend?:  string;
  href?:   string;
  color?:  "gold" | "sage" | "burgundy" | "copper";
}) {
  const colorMap = {
    gold:     "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/20",
    sage:     "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/20",
    burgundy: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/20",
    copper:   "text-vintage-copper   bg-vintage-copper/10   border-vintage-copper/20",
  };

  const card = (
    <div
      className="bg-vintage-white border border-vintage-sand p-6 hover:shadow-[var(--shadow-vintage-md)] transition-shadow group"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-1">{label}</p>
          <p className="font-serif text-3xl text-vintage-espresso">{value}</p>
          {trend && <p className="text-xs text-vintage-dust mt-1 font-sans">{trend}</p>}
        </div>
        <div className={`p-3 border ${colorMap[color]}`} style={{ borderRadius: "var(--radius-card)" }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {href && (
        <div className="mt-4 pt-4 border-t border-vintage-sand/50 flex items-center gap-1">
          <span className="text-xs font-sans text-vintage-dust group-hover:text-vintage-brown transition-colors">
            Details ansehen
          </span>
          <ArrowUpRight className="w-3 h-3 text-vintage-dust group-hover:text-vintage-brown transition-colors" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function AdminDashboard() {
  const session = await auth();

  // Echte Daten holen (Fallback bei DB-Fehlern)
  const [stats, recente] = await Promise.all([
    uebersichtStats().catch(() => null),
    letzteProdukte(5).catch(() => []),
  ]);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-vintage-gold text-sm tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso mt-1">
          Willkommen zurück{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Übersicht deines Galerie du Temps
        </p>
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Produkte gesamt"
          value={stats?.produkte_gesamt ?? "–"}
          icon={Package}
          color="gold"
          href="/admin/produkte"
        />
        <StatCard
          label="Verfügbar"
          value={stats?.produkte_verfuegbar ?? "–"}
          icon={ShoppingBag}
          color="sage"
          href="/admin/produkte"
          trend={stats ? `${stats.produkte_verkauft} verkauft` : undefined}
        />
        <StatCard
          label="Kontaktanfragen"
          value={stats?.kontakt_neu ?? "–"}
          icon={Mail}
          color="copper"
          href="/admin/kontakt"
          trend={stats ? `${stats.kontakt_gesamt} gesamt` : undefined}
        />
        <StatCard
          label="Wunschliste-User"
          value={stats?.wunschliste_user ?? "–"}
          icon={Heart}
          color="burgundy"
          trend={stats ? `${stats.wunschliste_eintraege} Einträge` : undefined}
        />
      </div>

      {/* Inhalts-Bereich */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Letzte Produkte */}
        <div
          className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-lg text-vintage-espresso">
              Zuletzt hinzugefügt
            </h2>
            <Link
              href="/admin/produkte/neu"
              className="text-xs font-sans uppercase tracking-widest px-4 py-2 bg-vintage-espresso text-vintage-cream hover:bg-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              + Neu
            </Link>
          </div>

          {recente.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-10 h-10 text-vintage-sand mb-3" />
              <p className="font-serif text-vintage-brown">Noch keine Produkte</p>
              <p className="text-vintage-dust text-sm font-sans mt-1">
                Füge dein erstes Vintage-Stück hinzu
              </p>
              <Link
                href="/admin/produkte/neu"
                className="mt-4 text-xs font-sans uppercase tracking-widest px-6 py-2.5 border border-vintage-sand text-vintage-brown hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Produkt erstellen
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-vintage-sand/50">
              {recente.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/produkte/${p.id}`}
                  className="py-3 flex items-center justify-between hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-vintage-ink font-sans truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ZustandBadge zustand={p.zustand} />
                      <span className="text-xs text-vintage-dust">
                        {new Date(p.erstellt_am).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                  </div>
                  <p className="font-serif text-vintage-espresso text-sm flex-shrink-0">
                    {formatPreis(p.preis)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Schnellzugriff + Inventar-Wert */}
        <div className="space-y-4">
          {stats && (
            <div
              className="bg-vintage-espresso text-vintage-cream p-6"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Inventar-Wert</p>
              <p className="font-serif text-3xl">
                {formatPreis(stats.gesamtwert)}
              </p>
              <p className="text-vintage-cream/60 text-xs font-sans mt-2">
                Ø {formatPreis(stats.durchschnittspreis)} pro Stück
              </p>
            </div>
          )}

          <div
            className="bg-vintage-white border border-vintage-sand p-6"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <h2 className="font-serif text-lg text-vintage-espresso mb-5">Schnellzugriff</h2>
            <div className="space-y-2">
              {[
                { href: "/admin/produkte/neu", label: "Produkt erstellen", icon: Package },
                { href: "/admin/kontakt",       label: "Anfragen prüfen",   icon: Mail    },
                { href: "/admin/statistiken",   label: "Statistiken",       icon: TrendingUp },
                { href: "/admin/preisanalyse",  label: "Preisanalyse",      icon: Clock   },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-sans text-vintage-brown border border-vintage-sand/60 hover:bg-vintage-parchment hover:border-vintage-sand transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  <Icon className="w-4 h-4 text-vintage-gold" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
