"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Mail,
  BarChart3,
  TrendingUp,
  LogOut,
  Store,
  Users,
  Coins,
  Wallet,
  Settings,
  ShoppingBag,
  Tag,
  Briefcase,
  FileText,
  Workflow,
  Filter,
  CheckSquare,
  BookOpen,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Navigation Items
// ---------------------------------------------------------------------------
const navItems = [
  {
    href:  "/admin",
    label: "Dashboard",
    icon:  LayoutDashboard,
    exact: true,
  },
  {
    href:  "/admin/produkte",
    label: "Produkte",
    icon:  Package,
    exact: false,
  },
  {
    href:  "/admin/kategorien",
    label: "Kategorien",
    icon:  Tag,
    exact: false,
  },
  {
    href:  "/admin/bestellungen",
    label: "Bestellungen",
    icon:  ShoppingBag,
    exact: false,
  },
  {
    href:  "/admin/coupons",
    label: "Gutscheine",
    icon:  Tag,
    exact: false,
  },
  {
    href:  "/admin/kontakt",
    label: "Kontaktanfragen",
    icon:  Mail,
    exact: false,
  },
  {
    href:  "/admin/kunden",
    label: "Kund:innen",
    icon:  Users,
    exact: true,
  },
  {
    href:  "/admin/b2b",
    label: "B2B-Anträge",
    icon:  Briefcase,
    exact: false,
  },
  {
    href:  "/admin/crm/pipeline",
    label: "CRM Pipeline",
    icon:  Filter,
    exact: false,
  },
  {
    href:  "/admin/crm/segments",
    label: "Segmente",
    icon:  Filter,
    exact: false,
  },
  {
    href:  "/admin/crm/flows",
    label: "Drip-Flows",
    icon:  Workflow,
    exact: false,
  },
  {
    href:  "/admin/crm/tasks",
    label: "Tasks",
    icon:  CheckSquare,
    exact: false,
  },
  {
    href:  "/admin/rechnungen",
    label: "Rechnungen",
    icon:  FileText,
    exact: false,
  },
  {
    href:  "/admin/statistiken",
    label: "Statistiken",
    icon:  BarChart3,
    exact: false,
  },
  {
    href:  "/admin/preisanalyse",
    label: "Preisanalyse",
    icon:  TrendingUp,
    exact: false,
  },
  {
    href:  "/admin/affiliates",
    label: "Affiliates",
    icon:  Users,
    exact: false,
  },
  {
    href:  "/admin/provisionen",
    label: "Provisionen",
    icon:  Coins,
    exact: false,
  },
  {
    href:  "/admin/auszahlungen",
    label: "Auszahlungen",
    icon:  Wallet,
    exact: false,
  },
  {
    href:  "/admin/newsletter",
    label: "Newsletter",
    icon:  Mail,
    exact: false,
  },
  {
    href:  "/admin/journal",
    label: "Journal",
    icon:  BookOpen,
    exact: false,
  },
  {
    href:  "/admin/einstellungen",
    label: "Einstellungen",
    icon:  Settings,
    exact: false,
  },
];

// ---------------------------------------------------------------------------
// Admin Sidebar
// ---------------------------------------------------------------------------
interface AdminSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Schließt das Mobile-Menü automatisch beim Navigieren
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Body-Scroll-Lock bei offenem Drawer
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else            document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile Hamburger-Button — fixed oben links */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Меню открыть"
        className="
          md:hidden fixed top-3 left-3 z-30
          p-2.5 bg-vintage-espresso text-vintage-cream
          border border-vintage-cream/20
          hover:bg-vintage-brown transition-colors
        "
        style={{ borderRadius: "var(--radius-vintage)", boxShadow: "var(--shadow-vintage-md)" }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop — nur auf Mobile + wenn offen */}
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
          aria-label="Меню закрыть"
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
              Administration
            </p>
          </div>
        </Link>
      </div>

      {/* ─── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5
                text-sm font-sans tracking-wide
                transition-colors
                ${
                  active
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
              <span>{label}</span>
              {active && (
                <span className="ml-auto w-1 h-4 bg-vintage-gold rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Zur Website ───────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <Link
          href="/"
          target="_blank"
          className="
            flex items-center gap-3 px-3 py-2.5
            text-xs font-sans tracking-widest uppercase
            text-vintage-cream/70 hover:text-vintage-cream
            transition-colors
          "
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Store className="w-3.5 h-3.5" />
          Zur Website
        </Link>
      </div>

      {/* ─── User + Logout ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar Initialen */}
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
              {userName ?? "Administrator"}
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
          Abmelden
        </button>
      </div>
    </aside>
    </>
  );
}
