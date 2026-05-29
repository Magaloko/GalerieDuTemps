import Link from "next/link";
import { query } from "@/lib/db";
import { adminBadgeCounts } from "@/lib/db/dashboard-v2";
import { Plus, LayoutGrid, ArrowRight } from "lucide-react";
import { PushToggle } from "./push-toggle";

export const dynamic = "force-dynamic";

async function loadToday() {
  const r = await query<{ revenue_today_cents: number; orders_pending: number }>(
    `SELECT
       (SELECT COALESCE(SUM(total_cents),0)::int FROM sebo.orders
         WHERE bezahlt_am::date = CURRENT_DATE AND status NOT IN ('cancelled','refunded')) AS revenue_today_cents,
       (SELECT COUNT(*)::int FROM sebo.orders
         WHERE status IN ('pending','paid') AND versendet_am IS NULL) AS orders_pending`,
  );
  return r.rows[0] ?? { revenue_today_cents: 0, orders_pending: 0 };
}

/* /app — „Сегодня": Tagesüberblick für den Betreiber. */
export default async function AppHeutePage() {
  const [today, b] = await Promise.all([
    loadToday().catch(() => ({ revenue_today_cents: 0, orders_pending: 0 })),
    adminBadgeCounts().catch(() => null),
  ]);
  const heute = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="px-4 py-5 space-y-5">
      <header>
        <p className="text-[10px] uppercase font-medium mb-1" style={{ letterSpacing: "0.24em", color: "var(--color-coral)" }}>
          ✦ {heute}
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--color-ink)", lineHeight: 1.1 }}>
          Сегодня
        </h1>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Выручка сегодня" value={today.revenue_today_cents > 0 ? `₸ ${Math.round(today.revenue_today_cents / 100).toLocaleString("ru-RU")}` : "—"} />
        <Kpi label="Заказов в работе" value={String(today.orders_pending)} accent={today.orders_pending > 0} href="/admin/bestellungen" />
        <Kpi label="Новых лидов"      value={String(b?.leads_unread ?? 0)}   accent={(b?.leads_unread ?? 0) > 0} href="/admin/leads" />
        <Kpi label="Задач на сегодня" value={String(b?.crm_tasks_today ?? 0)} href="/admin/crm/tasks" />
      </div>

      {/* Schnellzugriff */}
      <div className="grid grid-cols-2 gap-2.5">
        <Action href="/admin/produkte/neu" icon={Plus}       label="Новый товар" primary />
        <Action href="/app/menu"           icon={LayoutGrid} label="Все разделы" />
      </div>

      {/* Web-Push für Operator-Alerts (neuer Lead / neue Bestellung) */}
      <PushToggle />
    </div>
  );
}

function Kpi({ label, value, accent, href }: { label: string; value: string; accent?: boolean; href?: string }) {
  const inner = (
    <div className="p-3" style={{ background: "#fff", border: "1px solid var(--color-line)", borderLeft: accent ? "3px solid var(--color-coral)" : "1px solid var(--color-line)", borderRadius: 10 }}>
      <p className="text-[10px] uppercase font-medium mb-1" style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--color-ink)", lineHeight: 1 }}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Action({ href, icon: Icon, label, primary }: { href: string; icon: React.ElementType; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 py-3.5"
      style={{
        borderRadius: 10, touchAction: "manipulation",
        background: primary ? "var(--color-coral)" : "#fff",
        border:     primary ? "none" : "1px solid var(--color-line)",
        color:      primary ? "#fff" : "var(--color-ink)",
      }}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[12px] uppercase font-medium" style={{ letterSpacing: "0.12em" }}>{label}</span>
      {!primary && <ArrowRight className="w-3.5 h-3.5 opacity-40" />}
    </Link>
  );
}
