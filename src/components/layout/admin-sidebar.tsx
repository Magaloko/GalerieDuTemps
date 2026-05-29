"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Mail,
  Send,
  BarChart3,
  TrendingUp,
  LogOut,
  Store,
  Users,
  UserCheck,
  Coins,
  Wallet,
  Settings,
  ShoppingBag,
  Tag,
  Ticket,
  Briefcase,
  FileText,
  Workflow,
  Filter,
  Layers,
  CheckSquare,
  BookOpen,
  Menu,
  X,
  Inbox,
  ChevronDown,
  ExternalLink,
  LayoutTemplate,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Sidebar v2 — gruppiert, kollabierbar, mit Badge-Support
 *
 * Struktur (7 Gruppen + Top + Footer):
 *   • Главная (ohne Gruppe)
 *   1. Продажи         (Заказы/Счета/Статистика/Анализ цен)
 *   2. Каталог         (Товары/Категории/Промокоды)
 *   3. Клиенты         (Клиенты/Заявки B2B)
 *   4. Входящие и CRM  (Лиды/Сообщения/Воронка/Сегменты/Авто-цепочки/Задачи)
 *   5. Партнёры        (Партнёры/Комиссии/Выплаты)
 *   6. Контент         (Журнал/Рассылка)
 *   • Настройки (Footer-Link), На сайт, User-Menu
 *
 * UX-Verhalten:
 *  - Aktuelle Gruppe ist immer auf
 *  - Andere Gruppen sind default collapsed
 *  - User-Click toggle → state in localStorage gespeichert
 *  - Smart Mobile: nur aktuelle Gruppe sichtbar reduziert Scrolling
 *
 * Badges (Welle 2 — kommt im nächsten Commit):
 *  - badgeKey wird vom Layout via Props injected (counts aus DB)
 *  - rote Badge wenn Count > 0
 * ────────────────────────────────────────────────────────────────────────── */

type BadgeKey =
  | "orders_pending"
  | "b2b_pending"
  | "leads_unread"
  | "kontakt_neu"
  | "crm_tasks_today"
  | "auszahlungen_pending";

interface NavItem {
  href:      string;
  label:     string;
  icon:      React.ElementType;
  exact?:    boolean;
  badgeKey?: BadgeKey;
}

interface NavGroup {
  /** null = Top-Level (kein Header, immer sichtbar) */
  title: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  // Top-Level (kein Gruppen-Header)
  {
    title: null,
    items: [
      { href: "/admin", label: "Главная", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Продажи",
    items: [
      { href: "/admin/bestellungen", label: "Заказы",       icon: ShoppingBag, badgeKey: "orders_pending" },
      { href: "/admin/rechnungen",   label: "Счета",        icon: FileText },
      { href: "/admin/statistiken",  label: "Статистика",   icon: BarChart3 },
      { href: "/admin/preisanalyse", label: "Анализ цен",   icon: TrendingUp },
    ],
  },
  {
    title: "Каталог",
    items: [
      { href: "/admin/produkte",   label: "Товары",    icon: Package },
      { href: "/admin/kategorien", label: "Категории", icon: Tag },
      { href: "/admin/brands",     label: "Бренды",    icon: Briefcase },
      { href: "/admin/coupons",    label: "Промокоды", icon: Ticket },
    ],
  },
  {
    title: "Клиенты",
    items: [
      { href: "/admin/kunden", label: "Клиенты",     icon: Users,     exact: true },
      { href: "/admin/b2b",    label: "Заявки B2B",  icon: Briefcase, badgeKey: "b2b_pending" },
    ],
  },
  {
    title: "Входящие и CRM",
    items: [
      { href: "/admin/leads",         label: "Лиды",            icon: Inbox,       badgeKey: "leads_unread" },
      { href: "/admin/kontakt",       label: "Сообщения сайта", icon: Mail,        badgeKey: "kontakt_neu" },
      { href: "/admin/crm/pipeline",  label: "Воронка",         icon: Filter },
      { href: "/admin/crm/segments",  label: "Сегменты",        icon: Layers },
      { href: "/admin/crm/flows",     label: "Авто-цепочки",    icon: Workflow },
      { href: "/admin/crm/tasks",     label: "Задачи",          icon: CheckSquare, badgeKey: "crm_tasks_today" },
    ],
  },
  {
    title: "Партнёры",
    items: [
      { href: "/admin/affiliates",   label: "Партнёры", icon: UserCheck },
      { href: "/admin/provisionen",  label: "Комиссии", icon: Coins },
      { href: "/admin/auszahlungen", label: "Выплаты",  icon: Wallet, badgeKey: "auszahlungen_pending" },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/journal",    label: "Журнал",    icon: BookOpen },
      { href: "/admin/landing",    label: "Pages",     icon: LayoutTemplate },
      { href: "/admin/newsletter", label: "Рассылка",  icon: Send },
    ],
  },
];

// ---------------------------------------------------------------------------
// Admin Sidebar
// ---------------------------------------------------------------------------
interface AdminSidebarProps {
  userName?:  string | null;
  userEmail?: string | null;
  inboxCount?: number;
  /** Live-Counts pro Badge-Key (kommt aus Layout via Props in Welle 2) */
  badges?: Partial<Record<BadgeKey, number>>;
}

const LOCAL_STORAGE_KEY = "gdt-admin-sidebar-groups";

export function AdminSidebar({ userName, userEmail, inboxCount = 0, badges }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Backwards-Compat: alter inboxCount-Prop wird als leads_unread genutzt
  // wenn `badges` nicht explizit angegeben wurde
  const effectiveBadges: Partial<Record<BadgeKey, number>> = {
    ...(inboxCount > 0 ? { leads_unread: inboxCount } : {}),
    ...(badges ?? {}),
  };

  // Schließt das Mobile-Menü automatisch beim Navigieren
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Body-Scroll-Lock bei offenem Drawer
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else            document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Group-Collapse-State: aktuelle Gruppe + gespeicherte zusätzlich aufklappen
  useEffect(() => {
    const stored = (() => {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
      } catch {
        return new Set<string>();
      }
    })();

    // Aktuelle Gruppe immer auf
    const currentGroup = NAV_GROUPS.find(g =>
      g.title && g.items.some(i =>
        i.exact ? pathname === i.href : pathname.startsWith(i.href),
      ),
    );
    if (currentGroup?.title) stored.add(currentGroup.title);

    setOpenGroups(stored);
  }, [pathname]);

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  function toggleGroup(title: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else                 next.add(title);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return (
    <>
      {/* Mobile Hamburger-Button — fixed oben links */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть меню"
        className="md:hidden fixed top-3 left-3 z-30 p-2.5 transition-colors"
        style={{
          background:   "#fff",
          color:        "var(--color-ink)",
          border:       "1px solid var(--color-line)",
          borderRadius: 0,
          boxShadow:    "var(--shadow-soft)",
          touchAction:  "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-vintage-espresso/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 flex flex-col
          bg-vintage-espresso text-vintage-cream
          border-r border-vintage-espresso/80
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ boxShadow: "var(--shadow-vintage-lg)" }}
      >
        {/* Close-Button im Drawer-Header — nur Mobile */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Закрыть меню"
          className="md:hidden absolute top-3 right-3 p-2 text-vintage-cream/70 hover:text-vintage-cream hover:bg-white/10 transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* ─── Logo ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-7 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group">
            <Store className="w-5 h-5 text-vintage-gold group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-serif text-lg text-vintage-cream leading-tight">
                Galerie du Temps
              </p>
              <p className="text-vintage-dust text-xs tracking-wider uppercase">
                Админ-панель
              </p>
            </div>
          </Link>
        </div>

        {/* ─── Navigation (Groups) ───────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => {
            // Top-Level (kein Header, immer sichtbar)
            if (!group.title) {
              return (
                <div key={`top-${gi}`} className="mb-3 space-y-0.5">
                  {group.items.map(item => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(item.href, item.exact)}
                      badge={item.badgeKey ? effectiveBadges[item.badgeKey] : undefined}
                    />
                  ))}
                </div>
              );
            }

            const isOpen = openGroups.has(group.title);
            const groupHasActive = group.items.some(i => isActive(i.href, i.exact));

            return (
              <div key={group.title} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title!)}
                  className="w-full flex items-center justify-between px-3 py-2 group transition-colors"
                  style={{ borderRadius: "var(--radius-vintage)" }}
                >
                  <span
                    className="text-[10px] font-medium uppercase tracking-[0.28em]"
                    style={{
                      color: groupHasActive ? "var(--color-gold, #C9A84C)" : "rgba(245, 240, 232, 0.45)",
                    }}
                  >
                    {group.title}
                  </span>
                  <ChevronDown
                    className="w-3 h-3 transition-transform"
                    style={{
                      transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                      color:     "rgba(245, 240, 232, 0.5)",
                    }}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 mb-3 space-y-0.5">
                    {group.items.map(item => (
                      <NavLink
                        key={item.href}
                        item={item}
                        active={isActive(item.href, item.exact)}
                        badge={item.badgeKey ? effectiveBadges[item.badgeKey] : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ─── Footer-Links (Settings + To Site) ──────────────────────────── */}
        <div className="px-3 pb-2 border-t border-white/10 pt-2 space-y-0.5">
          <Link
            href="/admin/einstellungen"
            className={`
              flex items-center gap-3 px-3 py-2 text-sm font-sans
              transition-colors
              ${pathname.startsWith("/admin/einstellungen")
                ? "bg-white/15 text-vintage-cream"
                : "text-vintage-cream/85 hover:bg-white/8 hover:text-vintage-cream"
              }
            `}
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <Settings
              className={`w-4 h-4 flex-shrink-0 ${
                pathname.startsWith("/admin/einstellungen")
                  ? "text-vintage-gold"
                  : "text-vintage-cream/70"
              }`}
            />
            <span>Настройки</span>
          </Link>
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2 text-xs font-sans tracking-wider uppercase text-vintage-cream/65 hover:text-vintage-cream hover:bg-white/8 transition-colors"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            На сайт
          </Link>
        </div>

        {/* ─── User + Logout ─────────────────────────────────────────────── */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 bg-vintage-gold/20 border border-vintage-gold/40 flex items-center justify-center flex-shrink-0"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <span className="text-vintage-gold text-xs font-serif font-semibold">
                {(userName ?? userEmail ?? "A").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-vintage-cream text-sm font-sans truncate">
                {userName ?? "Администратор"}
              </p>
              <p className="text-vintage-dust text-xs truncate">
                {userEmail ?? ""}
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="
              w-full flex items-center gap-2 px-3 py-2
              text-vintage-cream/85 hover:text-vintage-burgundy
              hover:bg-vintage-burgundy/10
              text-xs font-sans tracking-wider uppercase
              transition-colors
            "
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── NavLink — einzelner Link-Eintrag mit Badge ──────────────────────── */
function NavLink({
  item,
  active,
  badge,
}: {
  item:   NavItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        flex items-center gap-3 px-3 py-2 text-sm font-sans tracking-wide
        transition-colors
        ${active
          ? "bg-white/15 text-vintage-cream"
          : "text-vintage-cream/85 hover:bg-white/8 hover:text-vintage-cream"
        }
      `}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <Icon
        className={`w-4 h-4 flex-shrink-0 ${
          active ? "text-vintage-gold" : "text-vintage-cream/70"
        }`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="min-w-5 h-5 px-1.5 bg-vintage-burgundy text-vintage-cream text-[10px] font-semibold flex items-center justify-center"
          style={{ borderRadius: "999px" }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {!badge && active && (
        <span className="w-1 h-4 bg-vintage-gold rounded-full" />
      )}
    </Link>
  );
}
