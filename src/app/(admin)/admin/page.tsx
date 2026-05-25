import { auth } from "@/lib/auth/config";
import Link from "next/link";
import {
  Package,
  ShoppingBag,
  Mail,
  Truck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import {
  uebersichtStats,
  letzteProdukte,
  letzteOrders,
  niedrigBestand,
} from "@/lib/db/statistiken";
import { formatPreis } from "@/lib/utils/preis";
import { ZustandBadge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const formatBestellnummer = (n: number) => `GDT-${String(n).padStart(4, "0")}`;

const STATUS_BADGE: Record<string, { label: string; klasse: string }> = {
  pending:   { label: "Wartet",        klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  paid:      { label: "Bezahlt",       klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  fulfilled: { label: "Versandt",      klasse: "text-vintage-forest   bg-vintage-forest/10"   },
  completed: { label: "Abgeschlossen", klasse: "text-vintage-forest   bg-vintage-forest/10"   },
  cancelled: { label: "Storniert",     klasse: "text-vintage-dust     bg-vintage-dust/10"     },
  refunded:  { label: "Erstattet",     klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
};

interface KpiProps {
  label:    string;
  value:    string | number;
  trend?:   string;
  icon:     React.ElementType;
  href?:    string;
  variant?: "default" | "warn" | "good" | "bad";
}

function Kpi({ label, value, trend, icon: Icon, href, variant = "default" }: KpiProps) {
  const variantStyles = {
    default: "bg-vintage-white border-vintage-sand text-vintage-espresso",
    warn:    "bg-vintage-gold/10 border-vintage-gold/30 text-vintage-espresso",
    good:    "bg-vintage-sage/10 border-vintage-sage/30 text-vintage-espresso",
    bad:     "bg-vintage-burgundy/10 border-vintage-burgundy/30 text-vintage-espresso",
  }[variant];

  const inner = (
    <div
      className={`border p-5 transition-shadow hover:shadow-[var(--shadow-vintage-md)] group ${variantStyles}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-1 flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" /> {label}
          </p>
          <p className="font-serif text-2xl">{value}</p>
          {trend && <p className="text-xs text-vintage-dust mt-1 font-sans">{trend}</p>}
        </div>
        {href && (
          <ArrowUpRight className="w-4 h-4 text-vintage-dust opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboard() {
  const session = await auth();

  const [stats, recente, recentOrders, niedrig] = await Promise.all([
    uebersichtStats().catch(() => null),
    letzteProdukte(5).catch(() => []),
    letzteOrders(6).catch(() => []),
    niedrigBestand(5).catch(() => []),
  ]);

  const heute = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div className="space-y-6">

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <div
        className="bg-vintage-espresso text-vintage-cream p-8 lg:p-10 relative overflow-hidden"
        style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-lg)" }}
      >
        <p className="text-vintage-gold text-xs tracking-[0.3em] uppercase mb-3">
          ✦ Admin-Übersicht
        </p>
        <h1 className="font-serif text-3xl lg:text-4xl italic leading-tight max-w-2xl">
          Heute zuerst das Wichtige, dann der laufende Betrieb.
        </h1>
        <p className="text-vintage-cream/70 text-sm font-sans mt-3 max-w-2xl">
          {session?.user?.name ? `${session.user.name} · ` : ""}{heute}
        </p>
        <div className="flex flex-wrap gap-2 mt-6">
          <Link
            href="/admin/produkte/neu"
            className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-gold text-vintage-espresso text-xs font-sans uppercase tracking-widest hover:bg-vintage-amber transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            + Neues Produkt
          </Link>
          <Link
            href="/admin/bestellungen?status=pending"
            className="inline-flex items-center gap-2 px-4 py-2 border border-vintage-cream/30 text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-cream/10 transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            Offene Bestellungen prüfen →
          </Link>
        </div>
      </div>

      {/* ─── KPI-Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Offene Bestellungen"
          value={stats?.bestellungen_pending ?? "–"}
          icon={Clock}
          href="/admin/bestellungen?status=pending"
          variant={(stats?.bestellungen_pending ?? 0) > 0 ? "warn" : "default"}
          trend={stats?.bestellungen_paid ? `${stats.bestellungen_paid} bezahlt, in Bearbeitung` : undefined}
        />
        <Kpi
          label="Heute verschickt"
          value={stats?.bestellungen_heute_versandt ?? 0}
          icon={Truck}
          href="/admin/bestellungen?status=fulfilled"
          variant={(stats?.bestellungen_heute_versandt ?? 0) > 0 ? "good" : "default"}
        />
        <Kpi
          label="Umsatz heute"
          value={stats ? formatPreis((stats.umsatz_heute_cents ?? 0) / 100) : "–"}
          icon={CreditCard}
          trend={stats ? `30 Tage: ${formatPreis((stats.umsatz_30tage_cents ?? 0) / 100)}` : undefined}
        />
        <Kpi
          label="Niedriger Bestand"
          value={stats?.produkte_niedrig ?? 0}
          icon={AlertTriangle}
          href="/admin/produkte"
          variant={(stats?.produkte_niedrig ?? 0) > 0 ? "bad" : "default"}
          trend="1–5 Stück verfügbar"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="Produkte aktiv"
          value={stats?.produkte_verfuegbar ?? "–"}
          icon={Package}
          href="/admin/produkte"
          trend={stats ? `${stats.produkte_gesamt} gesamt` : undefined}
        />
        <Kpi
          label="Featured"
          value={stats?.produkte_featured ?? "–"}
          icon={ShoppingBag}
          href="/admin/produkte"
        />
        <Kpi
          label="Kontaktanfragen"
          value={stats?.kontakt_neu ?? "–"}
          icon={Mail}
          href="/admin/kontakt"
          trend={stats ? `${stats.kontakt_gesamt} gesamt` : undefined}
          variant={(stats?.kontakt_neu ?? 0) > 0 ? "warn" : "default"}
        />
        <Kpi
          label="Umsatz gesamt"
          value={stats ? formatPreis((stats.umsatz_gesamt_cents ?? 0) / 100) : "–"}
          icon={TrendingUp}
          href="/admin/statistiken"
        />
      </div>

      {/* ─── Widgets-Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Letzte Bestellungen */}
        <section
          className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
              <Receipt className="w-4 h-4 text-vintage-gold" /> Letzte Bestellungen
            </h2>
            <Link
              href="/admin/bestellungen"
              className="text-xs font-sans uppercase tracking-widest text-vintage-dust hover:text-vintage-brown transition-colors"
            >
              Alle anzeigen →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="w-8 h-8 text-vintage-sand mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Noch keine Bestellungen</p>
            </div>
          ) : (
            <div className="divide-y divide-vintage-sand/50">
              {recentOrders.map(o => {
                const s = STATUS_BADGE[o.status] ?? STATUS_BADGE.pending;
                return (
                  <Link
                    key={o.id}
                    href={`/admin/bestellungen/${o.id}`}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-vintage-gold">
                          {formatBestellnummer(o.order_number)}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-sans ${s.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-sm text-vintage-ink truncate mt-0.5">
                        {o.customer_name ?? o.customer_email}
                      </p>
                      <p className="text-xs text-vintage-dust font-sans">
                        {new Date(o.erstellt_am).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <p className="font-serif text-vintage-espresso text-sm flex-shrink-0">
                      {formatPreis(o.total_cents / 100)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Niedriger Bestand */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-vintage-burgundy" /> Niedriger Bestand
          </h2>

          {niedrig.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-vintage-sage mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Alles aufgefüllt</p>
            </div>
          ) : (
            <div className="space-y-2">
              {niedrig.map(p => (
                <Link
                  key={p.id}
                  href={`/admin/produkte/${p.id}`}
                  className="flex items-center justify-between gap-2 py-2 hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  <p className="text-sm text-vintage-ink truncate flex-1">{p.name}</p>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 ${
                      p.lagerbestand === 1 ? "text-vintage-burgundy bg-vintage-burgundy/10" : "text-vintage-copper bg-vintage-copper/10"
                    }`}
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    {p.lagerbestand}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Zuletzt hinzugefügt */}
        <section
          className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
              <Package className="w-4 h-4 text-vintage-gold" /> Zuletzt hinzugefügt
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-vintage-sand mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Noch keine Produkte</p>
            </div>
          ) : (
            <div className="divide-y divide-vintage-sand/50">
              {recente.map(p => (
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
        </section>

        {/* Inventar-Wert */}
        <section
          className="bg-vintage-espresso text-vintage-cream p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">
            Inventar-Wert
          </p>
          <p className="font-serif text-3xl">
            {stats ? formatPreis(stats.gesamtwert) : "—"}
          </p>
          {stats && (
            <p className="text-vintage-cream/60 text-xs font-sans mt-2">
              Ø {formatPreis(stats.durchschnittspreis)} pro Stück ·
              {" "}{stats.produkte_verfuegbar} verfügbar
            </p>
          )}

          <div className="mt-6 pt-6 border-t border-vintage-cream/10 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-vintage-cream/60">Kategorien</span>
              <span className="font-serif">{stats?.kategorien ?? "–"}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-vintage-cream/60">Wunschliste-User</span>
              <span className="font-serif">{stats?.wunschliste_user ?? "–"}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-vintage-cream/60">Verkauft total</span>
              <span className="font-serif">{stats?.produkte_verkauft ?? "–"}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
