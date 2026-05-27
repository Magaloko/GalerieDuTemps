import { auth } from "@/lib/auth/config";
import Link from "next/link";
import {
  Package,
  Truck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  CreditCard,
  Heart,
} from "lucide-react";
import {
  uebersichtStats,
  letzteProdukte,
  letzteOrders,
  niedrigBestand,
} from "@/lib/db/statistiken";
import {
  aktionsItems,
  aktivitaetsFeed,
  umsatzTrend,
  berechneTrend,
} from "@/lib/db/dashboard-v2";
import { ActionBar } from "@/components/admin/dashboard/action-bar";
import { TrendKpi } from "@/components/admin/dashboard/trend-kpi";
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed";
import { formatPreis } from "@/lib/utils/preis";
import { ZustandBadge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Главная" };
export const dynamic = "force-dynamic";

const formatBestellnummer = (n: number) => `GDT-${String(n).padStart(4, "0")}`;

const STATUS_BADGE: Record<string, { label: string; klasse: string }> = {
  pending:   { label: "Ожидает",      klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  paid:      { label: "Оплачен",      klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  fulfilled: { label: "Отправлен",    klasse: "text-vintage-forest   bg-vintage-forest/10"   },
  completed: { label: "Завершён",     klasse: "text-vintage-forest   bg-vintage-forest/10"   },
  cancelled: { label: "Отменён",      klasse: "text-vintage-dust     bg-vintage-dust/10"     },
  refunded:  { label: "Возврат",      klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
};

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Dashboard v2
 *
 * Layout (top → bottom):
 *  1. Compact Hero — Greeting (time-aware) + 2 Quick-Actions
 *  2. ActionBar    — "Сегодня важно": priorisierte Action-Items mit Urgency
 *  3. Trend-KPIs   — 3 Cards: Umsatz heute/7T/30T mit vs-vortag-Indicator
 *  4. Secondary-KPIs — 4 Stats für Sekundär-Info
 *  5. 2-Col Widgets — Letzte Bestellungen + Activity-Feed
 *  6. 2-Col Widgets — Letzte Produkte + Niedriger Bestand
 *  7. Inventar-Wert (dark cobalt card, full-width)
 * ────────────────────────────────────────────────────────────────────────── */

function gruss(name: string | null | undefined): string {
  const h = new Date().getHours();
  const teil =
    h < 5  ? "Доброй ночи" :
    h < 12 ? "Доброе утро" :
    h < 17 ? "Добрый день" :
    h < 23 ? "Добрый вечер" :
             "Доброй ночи";
  return name ? `${teil}, ${name}` : teil;
}

export default async function AdminDashboard() {
  const session = await auth();

  const [stats, recente, recentOrders, niedrig, actions, activity, trends] = await Promise.all([
    uebersichtStats().catch(() => null),
    letzteProdukte(5).catch(() => []),
    letzteOrders(6).catch(() => []),
    niedrigBestand(5).catch(() => []),
    aktionsItems().catch(() => []),
    aktivitaetsFeed(24, 12).catch(() => []),
    umsatzTrend().catch(() => null),
  ]);

  const heute = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });

  // Trend-Berechnungen
  const umsatzHeuteTrend  = trends ? berechneTrend(trends.heute_cents, trends.gestern_cents) : null;
  const umsatzWocheTrend  = trends ? berechneTrend(trends.woche_cents, trends.vorwoche_cents) : null;
  const umsatzMonatTrend  = trends ? berechneTrend(trends.monat_cents, trends.vormonat_cents) : null;
  const ordersHeute       = trends?.orders_heute ?? 0;

  const formatCents = (cents: number) => formatPreis(cents / 100);

  return (
    <div className="space-y-6">

      {/* ─── 1. Compact Hero ─────────────────────────────────────── */}
      <div
        className="bg-vintage-espresso text-vintage-cream p-6 lg:p-8 relative overflow-hidden"
        style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-lg)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-vintage-gold text-xs tracking-[0.3em] uppercase mb-2">
              ✦ {heute}
            </p>
            <h1 className="font-serif text-2xl lg:text-3xl italic leading-tight">
              {gruss(session?.user?.name)}.
            </h1>
            {ordersHeute > 0 && (
              <p className="text-vintage-cream/70 text-sm font-sans mt-2">
                Сегодня уже{" "}
                <span className="text-vintage-gold font-serif">{ordersHeute}</span>
                {" "}
                {ordersHeute === 1 ? "заказ" : ordersHeute < 5 ? "заказа" : "заказов"}.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/produkte/neu"
              className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-gold text-vintage-espresso text-xs font-sans uppercase tracking-widest hover:bg-vintage-amber transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              + Новый товар
            </Link>
            <Link
              href="/admin/bestellungen?status=paid"
              className="inline-flex items-center gap-2 px-4 py-2 border border-vintage-cream/30 text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-cream/10 transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              К отправке →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. Action-Bar ────────────────────────────────────────── */}
      <ActionBar items={actions} />

      {/* ─── 3. Trend-KPIs (Umsatz mit vs Vortag/Woche/Monat) ────── */}
      {trends && umsatzHeuteTrend && umsatzWocheTrend && umsatzMonatTrend && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <TrendKpi
            label="Выручка сегодня"
            value={formatCents(trends.heute_cents)}
            trend={umsatzHeuteTrend}
            vergleich="vs вчера"
            formatVergleich={formatCents}
            icon={CreditCard}
          />
          <TrendKpi
            label="7 дней"
            value={formatCents(trends.woche_cents)}
            trend={umsatzWocheTrend}
            vergleich="vs прошлая неделя"
            formatVergleich={formatCents}
            icon={TrendingUp}
            href="/admin/statistiken"
          />
          <TrendKpi
            label="30 дней"
            value={formatCents(trends.monat_cents)}
            trend={umsatzMonatTrend}
            vergleich="vs прошлый месяц"
            formatVergleich={formatCents}
            icon={TrendingUp}
            href="/admin/statistiken"
          />
        </div>
      )}

      {/* ─── 4. Secondary KPIs (4 Mini-Cards) ────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi
          label="Открытые заказы"
          value={stats?.bestellungen_pending ?? 0}
          icon={Clock}
          href="/admin/bestellungen?status=pending"
          tone={(stats?.bestellungen_pending ?? 0) > 0 ? "warn" : "default"}
        />
        <MiniKpi
          label="Отправлено сегодня"
          value={stats?.bestellungen_heute_versandt ?? 0}
          icon={Truck}
          tone={(stats?.bestellungen_heute_versandt ?? 0) > 0 ? "good" : "default"}
        />
        <MiniKpi
          label="Товары в каталоге"
          value={stats?.produkte_verfuegbar ?? "–"}
          icon={Package}
          href="/admin/produkte"
        />
        <MiniKpi
          label="В избранном клиентов"
          value={stats?.wunschliste_user ?? 0}
          icon={Heart}
        />
      </div>

      {/* ─── 5. Bestellungen + ActivityFeed ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Letzte Bestellungen — 2/3 */}
        <section
          className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
              <Receipt className="w-4 h-4 text-vintage-gold" /> Последние заказы
            </h2>
            <Link
              href="/admin/bestellungen"
              className="text-xs font-sans uppercase tracking-widest text-vintage-dust hover:text-vintage-brown transition-colors"
            >
              Все →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Receipt className="w-8 h-8 text-vintage-sand mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Пока нет заказов</p>
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
                        {new Date(o.erstellt_am).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
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

        {/* Activity-Feed — 1/3 */}
        <ActivityFeed eintraege={activity} />
      </div>

      {/* ─── 6. Produkte + Niedriger Bestand ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Zuletzt hinzugefügt — 2/3 */}
        <section
          className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
              <Package className="w-4 h-4 text-vintage-gold" /> Недавно добавлено
            </h2>
            <Link
              href="/admin/produkte/neu"
              className="text-xs font-sans uppercase tracking-widest px-3 py-1.5 bg-vintage-espresso text-vintage-cream hover:bg-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              + Новый
            </Link>
          </div>

          {recente.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Package className="w-8 h-8 text-vintage-sand mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Пока нет товаров</p>
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
                        {new Date(p.erstellt_am).toLocaleDateString("ru-RU")}
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

        {/* Niedriger Bestand */}
        <section
          className="bg-vintage-white border border-vintage-sand p-6"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-vintage-burgundy" /> Низкий остаток
          </h2>

          {niedrig.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-vintage-sage mb-2" />
              <p className="text-sm font-sans text-vintage-dust">Запасы в порядке</p>
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
      </div>

      {/* ─── 7. Inventar-Wert (dark, full-width) ─────────────────── */}
      <section
        className="bg-vintage-espresso text-vintage-cream p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">
            Стоимость инвентаря
          </p>
          <p className="font-serif text-3xl">
            {stats ? formatPreis(stats.gesamtwert) : "—"}
          </p>
          {stats && (
            <p className="text-vintage-cream/60 text-xs font-sans mt-2">
              Ø {formatPreis(stats.durchschnittspreis)} за шт.
            </p>
          )}
        </div>

        <div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">
            Выручка всего
          </p>
          <p className="font-serif text-3xl">
            {stats ? formatPreis((stats.umsatz_gesamt_cents ?? 0) / 100) : "—"}
          </p>
          {stats && (
            <p className="text-vintage-cream/60 text-xs font-sans mt-2">
              {stats.produkte_verkauft} проданных товаров
            </p>
          )}
        </div>

        <div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">
            Каталог
          </p>
          <div className="space-y-1.5 mt-3">
            <Row label="Активных товаров" value={stats?.produkte_verfuegbar} />
            <Row label="Категорий"        value={stats?.kategorien} />
            <Row label="В избранном"      value={stats?.wunschliste_user} />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────── */

function MiniKpi({
  label, value, icon: Icon, href, tone = "default",
}: {
  label: string;
  value: string | number;
  icon:  React.ElementType;
  href?: string;
  tone?: "default" | "warn" | "good";
}) {
  const borderColor = {
    default: "var(--color-line)",
    warn:    "var(--color-coral)",
    good:    "#7A8B6F",
  }[tone];

  const inner = (
    <div
      className="group p-4 transition-shadow hover:shadow-[0_2px_12px_rgba(15,20,48,0.08)]"
      style={{ background: "#fff", border: `1px solid ${borderColor}`, borderRadius: 0 }}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[10px] uppercase font-medium flex items-center gap-1.5"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
        >
          <Icon className="w-3 h-3" style={{ color: "var(--color-coral)" }} />
          {label}
        </p>
        {href && (
          <ArrowUpRight
            className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
            style={{ color: "var(--color-coral)" }}
          />
        )}
      </div>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   22,
          color:      "var(--color-ink)",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex items-center justify-between text-xs font-sans">
      <span className="text-vintage-cream/60">{label}</span>
      <span className="font-serif">{value ?? "–"}</span>
    </div>
  );
}
