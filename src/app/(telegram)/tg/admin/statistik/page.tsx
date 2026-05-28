import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminNotAllowed } from "../_ui";
import { umsatzTrend } from "@/lib/db/dashboard-v2";
import { query } from "@/lib/db";
import { formatPreis } from "@/lib/utils/preis";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Статистика · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminStatistik() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const [t, extra, tage, top] = await Promise.all([
    umsatzTrend().catch(() => null),
    loadExtra().catch(() => ({ orders_total: 0, customers_total: 0, produkte_aktiv: 0 })),
    loadTage().catch(() => []),
    loadTop().catch(() => []),
  ]);

  const maxTag = Math.max(1, ...tage.map(d => d.cents));

  const pct = (cur: number, prev: number) =>
    prev > 0 ? `${cur >= prev ? "↑" : "↓"} ${Math.abs(Math.round((cur - prev) / prev * 100))}%` : "—";
  const pctColor = (cur: number, prev: number) => cur >= prev ? "#52663F" : "var(--color-coral-deep, #A53E26)";

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Продажи" titel="Статистика" />

        {t && (
          <div className="space-y-2.5">
            <Card label="Сегодня"  value={formatPreis(t.heute_cents / 100)} delta={pct(t.heute_cents, t.gestern_cents)} color={pctColor(t.heute_cents, t.gestern_cents)} sub={`${t.orders_heute} заказов · вчера ${formatPreis(t.gestern_cents/100)}`} />
            <Card label="Неделя"   value={formatPreis(t.woche_cents / 100)} delta={pct(t.woche_cents, t.vorwoche_cents)} color={pctColor(t.woche_cents, t.vorwoche_cents)} sub={`пред. неделя ${formatPreis(t.vorwoche_cents/100)}`} />
            <Card label="Месяц"    value={formatPreis(t.monat_cents / 100)} delta={pct(t.monat_cents, t.vormonat_cents)} color={pctColor(t.monat_cents, t.vormonat_cents)} sub={`пред. месяц ${formatPreis(t.vormonat_cents/100)}`} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Mini label="Заказов" value={extra.orders_total} />
          <Mini label="Клиентов" value={extra.customers_total} />
          <Mini label="Товаров" value={extra.produkte_aktiv} />
        </div>

        {/* 7-Tage-Umsatz als Balken */}
        {tage.length > 0 && (
          <section className="mt-5 p-4" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
            <p className="text-[10px] uppercase font-medium mb-3" style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
              Выручка · 7 дней
            </p>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 96 }}>
              {tage.map((d, i) => {
                const h = Math.max(2, Math.round((d.cents / maxTag) * 84));
                const istHeute = i === tage.length - 1;
                return (
                  <div key={d.tag} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                    <div
                      title={formatPreis(d.cents / 100)}
                      style={{
                        width:        "100%",
                        height:       h,
                        background:   istHeute ? "var(--color-coral)" : "rgba(232,112,58,0.30)",
                        borderRadius: "3px 3px 0 0",
                      }}
                    />
                    <span className="text-[8px] uppercase" style={{ letterSpacing: "0.05em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                      {wochentag(d.tag)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top-Produkte (30 Tage) */}
        {top.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] uppercase font-medium mb-2 px-1" style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
              Хиты · 30 дней
            </p>
            <div className="space-y-2">
              {top.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
                  <span className="text-sm tabular-nums shrink-0 w-4 text-center" style={{ fontFamily: "var(--font-display)", color: "var(--color-coral)" }}>{i + 1}</span>
                  <div className="w-9 h-9 shrink-0 overflow-hidden" style={{ background: "var(--color-bone)" }}>
                    {p.produkt_bild_url && /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.produkt_bild_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>{p.produkt_name}</p>
                    <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{p.menge} шт.</p>
                  </div>
                  <p className="text-xs font-mono tabular-nums shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>{formatPreis(p.umsatz_cents / 100)}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </TelegramAuthGate>
  );
}

function Card({ label, value, delta, color, sub }: { label: string; value: string; delta: string; color: string; sub: string }) {
  return (
    <div className="p-4" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase font-medium" style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>{label}</p>
        <span className="text-[11px] font-mono" style={{ color }}>{delta}</span>
      </div>
      <p className="mt-1" style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1 }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{sub}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2.5 text-center" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--tg-theme-text-color, var(--color-ink))" }}>{value}</p>
      <p className="text-[9px] uppercase mt-0.5" style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{label}</p>
    </div>
  );
}

async function loadExtra() {
  const r = await query<{ orders_total: number; customers_total: number; produkte_aktiv: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM sebo.orders WHERE status NOT IN ('cancelled')) AS orders_total,
       (SELECT COUNT(*)::int FROM sebo.customers) AS customers_total,
       (SELECT COUNT(*)::int FROM sebo.produkte WHERE aktiv = true) AS produkte_aktiv`,
  );
  return r.rows[0] ?? { orders_total: 0, customers_total: 0, produkte_aktiv: 0 };
}

/** Tagesumsatz der letzten 7 Tage (inkl. Lücken via generate_series). */
async function loadTage(): Promise<{ tag: string; cents: number }[]> {
  const r = await query<{ tag: string; cents: number }>(
    `SELECT d::date::text AS tag,
       COALESCE((
         SELECT SUM(o.total_cents) FROM sebo.orders o
          WHERE o.bezahlt_am::date = d::date AND o.status NOT IN ('cancelled','refunded')
       ), 0)::int AS cents
     FROM generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day') d
     ORDER BY d`,
  );
  return r.rows;
}

/** Top-5 Produkte nach Umsatz der letzten 30 Tage. */
async function loadTop(): Promise<{ produkt_name: string; produkt_bild_url: string | null; menge: number; umsatz_cents: number }[]> {
  const r = await query<{ produkt_name: string; produkt_bild_url: string | null; menge: number; umsatz_cents: number }>(
    `SELECT oi.produkt_name,
            MAX(oi.produkt_bild_url) AS produkt_bild_url,
            SUM(oi.menge)::int AS menge,
            SUM(oi.zeile_total_cents)::int AS umsatz_cents
       FROM sebo.order_items oi
       JOIN sebo.orders o ON o.id = oi.order_id
      WHERE o.bezahlt_am > now() - interval '30 days'
        AND o.status NOT IN ('cancelled','refunded')
      GROUP BY oi.produkt_name
      ORDER BY umsatz_cents DESC
      LIMIT 5`,
  );
  return r.rows;
}

/** Kurz-Wochentag (RU) aus ISO-Datum. */
function wochentag(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "short" });
}
