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

  const [t, extra] = await Promise.all([
    umsatzTrend().catch(() => null),
    loadExtra().catch(() => ({ orders_total: 0, customers_total: 0, produkte_aktiv: 0 })),
  ]);

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
