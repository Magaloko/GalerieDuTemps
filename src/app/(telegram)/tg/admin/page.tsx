import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../auth-gate";
import { query } from "@/lib/db";
import {
  Shield, Inbox, Package, Users, BarChart3, ExternalLink, ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Админ · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin — Mini-App-Übersicht für Admin/Manager.
 *
 * Zeigt:
 *  - 4 KPI-Tiles: pending Leads, ungelesene Inbox, pending Orders heute,
 *    Umsatz heute
 *  - 3 Action-Cards: Inbox · Заказы · полная Admin-Console (extern)
 *  - Hinweis dass viele Settings besser auf dem Desktop-Admin sind
 *
 * Wenn kein Admin-Cookie → Redirect-Hint zu /tg (Mini-App-Catalog) statt
 * 403, weil der TabBar sonst auf eine 404-Seite zeigen würde.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminHome() {
  const session = await getWebAppSession();

  if (!session || session.role !== "admin") {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Shield className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   22,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
            }}
          >
            Только для администраторов
          </h1>
          <p
            className="text-sm max-w-xs"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              lineHeight: 1.5,
            }}
          >
            Раздел доступен только если ваш Telegram-аккаунт привязан как
            администратор в кабинете на сайте.
          </p>
          <Link
            href="/tg"
            className="mt-3 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
          >
            ← В каталог
          </Link>
        </main>
      </TelegramAuthGate>
    );
  }

  // ── KPIs einsammeln (alles best-effort, default 0) ─────────────────────
  const kpis = await loadKpis().catch(() => ({
    inbox_unread: 0,
    leads_pending: 0,
    orders_pending: 0,
    revenue_today_cents: 0,
  }));

  return (
    <TelegramAuthGate>
      <main className="p-4 space-y-5">

        {/* Header */}
        <header>
          <p
            className="flex items-center gap-2 text-[10px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            <Shield className="w-3 h-3" /> Админ
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   24,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight: 1.1,
            }}
          >
            Сегодня
          </h1>
        </header>

        {/* KPI-Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <KpiTile label="Inbox"   value={kpis.inbox_unread}   icon={Inbox}   coral={kpis.inbox_unread > 0} />
          <KpiTile label="Лиды"    value={kpis.leads_pending}  icon={Users}   coral={kpis.leads_pending > 0} />
          <KpiTile label="Заказы"  value={kpis.orders_pending} icon={Package} coral={kpis.orders_pending > 0} />
          <KpiTile
            label="Выручка"
            value={kpis.revenue_today_cents > 0
              ? `₸ ${Math.round(kpis.revenue_today_cents / 100).toLocaleString("ru-RU")}`
              : "—"}
            icon={BarChart3}
          />
        </div>

        {/* Quick-Links */}
        <section className="space-y-2 pt-2">
          <NavRow href="/tg/admin/inbox"  icon={Inbox}   label="Inbox · сообщения" badge={kpis.inbox_unread} />
          <NavRow href="/tg/admin/orders" icon={Package} label="Заказы · обработать" badge={kpis.orders_pending} />
        </section>

        {/* Externe Admin-Console */}
        <section
          className="pt-4"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <p
            className="text-[10px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
          >
            Полный кабинет
          </p>
          <a
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3"
            style={{
              background:  "var(--tg-theme-section-bg-color, #fff)",
              border:      "1px solid var(--color-line)",
              touchAction: "manipulation",
            }}
          >
            <Shield className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
            <span
              className="text-sm flex-1"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              Открыть /admin
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
          </a>
          <p
            className="text-[10px] mt-2"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
            }}
          >
            Управление каталогом, настройки, отчёты — на десктопе.
          </p>
        </section>
      </main>
    </TelegramAuthGate>
  );
}

/* ── Sub-Components ──────────────────────────────────────────────────── */

function KpiTile({
  label, value, icon: Icon, coral,
}: {
  label: string;
  value: string | number;
  icon:  React.ElementType;
  coral?: boolean;
}) {
  return (
    <div
      className="p-3"
      style={{
        background: "var(--tg-theme-section-bg-color, #fff)",
        border:     "1px solid var(--color-line)",
        borderLeft: coral ? "3px solid var(--color-coral)" : "1px solid var(--color-line)",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color: coral ? "var(--color-coral)" : "var(--color-ink-mute)" }} />
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   22,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function NavRow({
  href, icon: Icon, label, badge,
}: {
  href:  string;
  icon:  React.ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3"
      style={{
        background:  "var(--tg-theme-section-bg-color, #fff)",
        border:      "1px solid var(--color-line)",
        touchAction: "manipulation",
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
      <span
        className="text-sm flex-1"
        style={{
          fontFamily: "var(--font-display)",
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5"
          style={{
            background:   "var(--color-coral)",
            color:        "#fff",
            borderRadius: 999,
            minWidth:     20,
            textAlign:    "center",
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
    </Link>
  );
}

/* ── KPI-Loader ──────────────────────────────────────────────────────── */

async function loadKpis(): Promise<{
  inbox_unread:        number;
  leads_pending:       number;
  orders_pending:      number;
  revenue_today_cents: number;
}> {
  const r = await query<{
    inbox_unread:        number;
    leads_pending:       number;
    orders_pending:      number;
    revenue_today_cents: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM sebo.lead_messages
        WHERE richtung = 'inbound' AND gelesen = false) AS inbox_unread,
       (SELECT COUNT(*)::int FROM sebo.leads
        WHERE status IN ('neu', 'in_arbeit')) AS leads_pending,
       (SELECT COUNT(*)::int FROM sebo.orders
        WHERE status IN ('pending', 'paid') AND versendet_am IS NULL) AS orders_pending,
       (SELECT COALESCE(SUM(total_cents), 0)::int FROM sebo.orders
        WHERE bezahlt_am::date = CURRENT_DATE AND status NOT IN ('cancelled', 'refunded'))
        AS revenue_today_cents`,
  );
  return r.rows[0] ?? {
    inbox_unread: 0, leads_pending: 0, orders_pending: 0, revenue_today_cents: 0,
  };
}
