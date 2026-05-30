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
        { href: "/admin/rechnungen",   label: "Счета",       icon: FileText },
        { href: "/admin/statistiken",  label: "Статистика",  icon: BarChart3 },
        { href: "/admin/preisanalyse", label: "Анализ цен",  icon: TrendingUp },
      ],
    },
    {
      title: "Каталог",
      items: [
        { href: "/app/produkte",     label: "Товары",     icon: Package },
        { href: "/admin/kategorien", label: "Категории",  icon: Tag },
        { href: "/admin/coupons",    label: "Промокоды",  icon: Ticket },
      ],
    },
    {
      title: "Клиенты",
      items: [
        { href: "/app/kunden", label: "Клиенты",    icon: Users },
        { href: "/admin/b2b",    label: "Заявки B2B", icon: Briefcase, badge: b?.b2b_pending },
      ],
    },
    {
      title: "Входящие и CRM",
      items: [
        { href: "/app/leads",        label: "Лиды",      icon: Inbox,     badge: b?.leads_unread },
        { href: "/admin/kontakt",      label: "Сообщения", icon: Mail,      badge: b?.kontakt_neu },
        { href: "/admin/crm/pipeline", label: "Воронка",   icon: GitBranch },
        { href: "/admin/crm/segments", label: "Сегменты",  icon: Layers },
        { href: "/admin/crm/flows",    label: "Цепочки",   icon: Workflow },
        { href: "/admin/crm/tasks",    label: "Задачи",    icon: CheckSquare, badge: b?.crm_tasks_today },
      ],
    },
    {
      title: "Партнёры",
      items: [
        { href: "/admin/affiliates",   label: "Партнёры", icon: UserCheck },
        { href: "/admin/provisionen",  label: "Комиссии", icon: Coins },
        { href: "/admin/auszahlungen", label: "Выплаты",  icon: Wallet, badge: b?.auszahlungen_pending },
      ],
    },
    {
      title: "Контент",
      items: [
        { href: "/admin/journal",    label: "Журнал",   icon: BookOpen },
        { href: "/admin/newsletter", label: "Рассылка", icon: Send },
      ],
    },
    {
      title: "Настройки",
      items: [
        { href: "/admin/einstellungen", label: "Настройки", icon: Settings },
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
      <div
        className="relative w-full aspect-square flex items-center justify-center"
        style={{ background: "var(--color-bone, #EFEAE0)", borderRadius: 14 }}
      >
        <Icon className="w-6 h-6" strokeWidth={1.6} style={{ color: "var(--color-ink-soft, #3A3E5C)" }} />
        {item.badge != null && item.badge > 0 && (
          <span
            className="absolute top-1.5 right-1.5 text-[10px] font-medium flex items-center justify-center"
            style={{ background: "var(--color-coral)", color: "#fff", borderRadius: 999, minWidth: 18, height: 18, padding: "0 5px", lineHeight: "18px" }}
          >
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
