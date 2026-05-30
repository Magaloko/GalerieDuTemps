import Link from "next/link";
import {
  ShoppingBag, FileText, BarChart3, TrendingUp, Package, Tag, Ticket,
  Users, Briefcase, Inbox, Mail, GitBranch, Layers, Workflow, CheckSquare,
  UserCheck, Coins, Wallet, BookOpen, Send, Settings,
} from "lucide-react";
import { adminBadgeCounts } from "@/lib/db/dashboard-v2";

export const dynamic = "force-dynamic";

interface Tile { href: string; label: string; icon: React.ElementType; badge?: number }
interface Group { title: string; items: Tile[] }

/* /app/menu — Facebook-Business-Suite-Kachelmenü (Web-Operator-App). */
export default async function AppMenuPage() {
  const b = await adminBadgeCounts().catch(() => null);

  const groups: Group[] = [
    {
      title: "Продажи",
      items: [
        { href: "/app/bestellungen", label: "Заказы",      icon: ShoppingBag, badge: b?.orders_pending },
        { href: "/app/rechnungen",   label: "Счета",       icon: FileText },
        { href: "/app/statistiken",  label: "Статистика",  icon: BarChart3 },
        { href: "/app/preisanalyse", label: "Анализ цен",  icon: TrendingUp },
      ],
    },
    {
      title: "Каталог",
      items: [
        { href: "/app/produkte",     label: "Товары",     icon: Package },
        { href: "/app/kategorien", label: "Категории",  icon: Tag },
        { href: "/app/coupons",    label: "Промокоды",  icon: Ticket },
      ],
    },
    {
      title: "Клиенты",
      items: [
        { href: "/app/kunden", label: "Клиенты",    icon: Users },
        { href: "/app/b2b",    label: "Заявки B2B", icon: Briefcase, badge: b?.b2b_pending },
      ],
    },
    {
      title: "Входящие и CRM",
      items: [
        { href: "/app/leads",        label: "Лиды",      icon: Inbox,     badge: b?.leads_unread },
        { href: "/app/kontakt",      label: "Сообщения", icon: Mail,      badge: b?.kontakt_neu },
        { href: "/app/crm/pipeline", label: "Воронка",   icon: GitBranch },
        { href: "/app/crm/segments", label: "Сегменты",  icon: Layers },
        { href: "/app/crm/flows",    label: "Цепочки",   icon: Workflow },
        { href: "/app/crm/tasks",    label: "Задачи",    icon: CheckSquare, badge: b?.crm_tasks_today },
      ],
    },
    {
      title: "Партнёры",
      items: [
        { href: "/app/affiliates",   label: "Партнёры", icon: UserCheck },
        { href: "/app/provisionen",  label: "Комиссии", icon: Coins },
        { href: "/app/auszahlungen", label: "Выплаты",  icon: Wallet, badge: b?.auszahlungen_pending },
      ],
    },
    {
      title: "Контент",
      items: [
        { href: "/app/journal",    label: "Журнал",   icon: BookOpen },
        { href: "/app/newsletter", label: "Рассылка", icon: Send },
      ],
    },
    {
      title: "Настройки",
      items: [
        { href: "/app/einstellungen", label: "Настройки", icon: Settings },
      ],
    },
  ];

  return (
    <div className="px-4 py-4 space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="text-[11px] uppercase font-medium mb-3 px-1"
              style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>
            {g.title}
          </h2>
          <ul className="grid grid-cols-3 gap-3">
            {g.items.map((it) => (
              <li key={it.href}><MenuTile item={it} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MenuTile({ item }: { item: Tile }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex flex-col items-center gap-2" style={{ touchAction: "manipulation" }}>
      <div className="app-tile relative w-full aspect-square flex items-center justify-center">
        <Icon className="w-6 h-6" strokeWidth={1.6} style={{ color: "var(--color-ink-soft)" }} />
        {item.badge != null && item.badge > 0 && (
          <span className="app-badge absolute top-1.5 right-1.5">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </div>
      <span className="text-[11px] text-center leading-tight" style={{ color: "var(--color-ink)" }}>
        {item.label}
      </span>
    </Link>
  );
}
