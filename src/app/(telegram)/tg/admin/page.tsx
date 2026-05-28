import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../auth-gate";
import { AdminNotAllowed } from "./_ui";
import { adminBadgeCounts } from "@/lib/db/dashboard-v2";
import { query } from "@/lib/db";
import {
  Shield, Inbox, Package, Users, BarChart3, ShoppingBag, FileText,
  Tag, Ticket, Briefcase, Mail, UserCheck, Coins, Wallet, BookOpen,
  Send, ArrowRight, ExternalLink, TrendingUp, Clock,
} from "lucide-react";
import { InstagramIcon } from "@/components/produkte/instagram-icon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Админ · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin — Voll-gruppiertes Admin-Menü (spiegelt die Web-Sidebar).
 *
 * Jedes Item ist entweder:
 *  - native (eigene /tg/admin/* Mini-App-Seite) → interner Link, „kind:native"
 *  - web (noch keine native Seite) → öffnet /admin/* extern, „kind:web"
 *    (Admin muss im externen Browser eingeloggt sein — Hinweis im UI)
 *
 * Live-Badges aus adminBadgeCounts (30s gecached).
 * ────────────────────────────────────────────────────────────────────────── */

type ItemKind = "native" | "web";
interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ElementType;
  kind:   ItemKind;
  badge?: number;
}
interface NavGroup { title: string; items: NavItem[] }

export default async function TgAdminHome() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const [badges, today, reservCount] = await Promise.all([
    adminBadgeCounts().catch(() => null),
    loadToday().catch(() => ({ revenue_today_cents: 0, orders_pending: 0 })),
    loadReservCount().catch(() => 0),
  ]);
  const b = badges ?? {
    orders_pending: 0, b2b_pending: 0, leads_unread: 0, kontakt_neu: 0,
    crm_tasks_today: 0, auszahlungen_pending: 0,
  };

  const groups: NavGroup[] = [
    {
      title: "Продажи",
      items: [
        { href: "/tg/admin/orders",      label: "Заказы",      icon: ShoppingBag, kind: "native", badge: b.orders_pending },
        { href: "/tg/admin/statistik",   label: "Статистика",  icon: BarChart3,   kind: "native" },
        { href: "/admin/rechnungen",     label: "Счета",       icon: FileText,    kind: "web" },
        { href: "/admin/preisanalyse",   label: "Анализ цен",  icon: TrendingUp,  kind: "web" },
      ],
    },
    {
      title: "Каталог",
      items: [
        { href: "/tg/admin/produkte",       label: "Товары",     icon: Package,   kind: "native" },
        { href: "/tg/admin/reservierungen", label: "Брони",      icon: Clock,     kind: "native", badge: reservCount },
        { href: "/tg/admin/kategorien",     label: "Категории",  icon: Tag,       kind: "native" },
        { href: "/tg/admin/instagram",      label: "Instagram",  icon: InstagramIcon, kind: "native" },
        { href: "/tg/admin/coupons",        label: "Промокоды",  icon: Ticket,    kind: "native" },
      ],
    },
    {
      title: "Клиенты",
      items: [
        { href: "/tg/admin/kunden", label: "Клиенты",    icon: Users,     kind: "native" },
        { href: "/tg/admin/b2b",    label: "Заявки B2B", icon: Briefcase, kind: "native", badge: b.b2b_pending },
      ],
    },
    {
      title: "Входящие и CRM",
      items: [
        { href: "/tg/admin/inbox",     label: "Лиды / Inbox",    icon: Inbox, kind: "native", badge: b.leads_unread },
        { href: "/admin/kontakt",      label: "Сообщения сайта", icon: Mail,  kind: "web", badge: b.kontakt_neu },
        { href: "/admin/crm/pipeline", label: "Воронка / CRM",   icon: Users, kind: "web", badge: b.crm_tasks_today },
      ],
    },
    {
      title: "Партнёры",
      items: [
        { href: "/tg/admin/auszahlungen", label: "Выплаты",  icon: Wallet,    kind: "native", badge: b.auszahlungen_pending },
        { href: "/admin/affiliates",      label: "Партнёры", icon: UserCheck, kind: "web" },
        { href: "/admin/provisionen",     label: "Комиссии", icon: Coins,     kind: "web" },
      ],
    },
    {
      title: "Контент",
      items: [
        { href: "/admin/journal",    label: "Журнал",   icon: BookOpen, kind: "web" },
        { href: "/admin/newsletter", label: "Рассылка", icon: Send,     kind: "web" },
      ],
    },
  ];

  return (
    <TelegramAuthGate>
      <main className="p-4 space-y-5 pb-8">
        {/* Header + Today KPIs */}
        <header>
          <p className="flex items-center gap-2 text-[10px] uppercase font-medium mb-2"
             style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            <Shield className="w-3 h-3" /> Админ-панель
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1.1 }}>
            Управление
          </h1>
        </header>

        <div className="grid grid-cols-2 gap-2.5">
          <Kpi label="Выручка сегодня" value={today.revenue_today_cents > 0 ? `₸ ${Math.round(today.revenue_today_cents/100).toLocaleString("ru-RU")}` : "—"} />
          <Kpi label="Заказов в работе" value={String(b.orders_pending)} coral={b.orders_pending>0} />
        </div>

        {/* Grouped menu */}
        {groups.map(g => (
          <section key={g.title} className="space-y-1.5">
            <p className="text-[10px] uppercase font-medium px-1"
               style={{ letterSpacing: "0.24em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              {g.title}
            </p>
            {g.items.map(it => <MenuRow key={it.href} item={it} />)}
          </section>
        ))}

        <p className="text-[10px] text-center pt-2"
           style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          ↗ — раздел откроется на сайте (нужен вход в /admin). Остальное работает прямо здесь.
        </p>
      </main>
    </TelegramAuthGate>
  );
}

function Kpi({ label, value, coral }: { label: string; value: string; coral?: boolean }) {
  return (
    <div className="p-3" style={{
      background: "var(--tg-theme-section-bg-color, #fff)",
      border:     "1px solid var(--color-line)",
      borderLeft: coral ? "3px solid var(--color-coral)" : "1px solid var(--color-line)",
    }}>
      <p className="text-[10px] uppercase font-medium mb-1"
         style={{ letterSpacing: "0.2em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}

function MenuRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const inner = (
    <>
      <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
      <span className="text-sm flex-1" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
        {item.label}
      </span>
      {item.badge != null && item.badge > 0 && (
        <span className="text-[10px] font-medium px-1.5 py-0.5"
              style={{ background: "var(--color-coral)", color: "#fff", borderRadius: 999, minWidth: 20, textAlign: "center" }}>
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
      {item.kind === "web"
        ? <ExternalLink className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
        : <ArrowRight   className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />}
    </>
  );
  const cls = "flex items-center gap-3 p-3";
  const style: React.CSSProperties = {
    background:  "var(--tg-theme-section-bg-color, #fff)",
    border:      "1px solid var(--color-line)",
    touchAction: "manipulation",
    opacity:     item.kind === "web" ? 0.85 : 1,
  };
  return item.kind === "native"
    ? <Link href={item.href} className={cls} style={style}>{inner}</Link>
    : <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{inner}</a>;
}

async function loadToday(): Promise<{ revenue_today_cents: number; orders_pending: number }> {
  const r = await query<{ revenue_today_cents: number; orders_pending: number }>(
    `SELECT
       (SELECT COALESCE(SUM(total_cents),0)::int FROM sebo.orders
        WHERE bezahlt_am::date = CURRENT_DATE AND status NOT IN ('cancelled','refunded')) AS revenue_today_cents,
       (SELECT COUNT(*)::int FROM sebo.orders
        WHERE status IN ('pending','paid') AND versendet_am IS NULL) AS orders_pending`,
  );
  return r.rows[0] ?? { revenue_today_cents: 0, orders_pending: 0 };
}

async function loadReservCount(): Promise<number> {
  const r = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM sebo.produkte
      WHERE verkauft = false AND reserviert_bis IS NOT NULL AND reserviert_bis > now()`,
  );
  return r.rows[0]?.n ?? 0;
}
