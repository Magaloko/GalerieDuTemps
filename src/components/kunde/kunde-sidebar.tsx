"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingBag, UserCircle, Lock, Briefcase,
  Heart, LogOut, ExternalLink, Menu, X,
} from "lucide-react";
import { Hourglass } from "@/components/brand/hourglass";
import type { CustomerType } from "@/types/commerce";

interface Props {
  vorname?:       string | null;
  email?:         string | null;
  customer_type:  CustomerType;
}

/* ──────────────────────────────────────────────────────────────────────────
 * KundeSidebar — Galerie-Refresh (paper/coral statt dark-vintage).
 *
 * Layout:
 *   ┌─ Logo + „Мой кабинет" Label ─┐
 *   │ Status-Badge (Частный/B2B)  │
 *   ├─ Navigation ────────────────┤
 *   │  Обзор · Заказы · ...       │
 *   ├─ К каталогу (extern)        │
 *   ├─ Avatar + Name + Logout     │
 *   └─────────────────────────────┘
 *
 * Mobile: Drawer mit Hamburger oben links.
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<CustomerType, string> = {
  b2c:           "Частный клиент",
  b2b_pending:   "B2B · на рассмотрении",
  b2b_verified:  "B2B · подтверждён",
  b2b_rejected:  "B2B · отклонён",
};

const STATUS_COLOR: Record<CustomerType, string> = {
  b2c:           "var(--color-ink-mute)",
  b2b_pending:   "#C9A84C",  // gold
  b2b_verified:  "#52663F",  // forest
  b2b_rejected:  "var(--color-coral-deep, #A53E26)",
};

export function KundeSidebar({ vorname, email, customer_type }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const istB2BBereich = customer_type.startsWith("b2b") || customer_type === "b2c";

  const navItems = [
    { href: "/kunde",              label: "Обзор",     icon: LayoutDashboard, exact: true  },
    { href: "/kunde/bestellungen", label: "Заказы",    icon: ShoppingBag,     exact: false },
    { href: "/wunschliste",        label: "Избранное", icon: Heart,           exact: false },
    ...(istB2BBereich
      ? [{ href: "/kunde/b2b", label: "B2B-статус", icon: Briefcase, exact: false }]
      : []),
    { href: "/kunde/profil",       label: "Профиль",   icon: UserCircle,      exact: false },
    { href: "/kunde/passwort",     label: "Пароль",    icon: Lock,            exact: false },
  ];

  const Inhalt = (
    <div className="flex flex-col h-full">

      {/* ─── Logo + Sub-Label ────────────────────────────────── */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid var(--color-line)" }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Hourglass size={22} className="text-coral" />
          <div className="min-w-0">
            <p
              className="wordmark leading-none"
              style={{ fontSize: 16, color: "var(--color-ink)" }}
            >
              GALERIE
            </p>
            <p
              className="text-[10px] uppercase font-medium mt-0.5"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              Мой кабинет
            </p>
          </div>
        </Link>
      </div>

      {/* ─── Status ──────────────────────────────────────────── */}
      <div
        className="px-5 py-3"
        style={{ borderBottom: "1px solid var(--color-line)" }}
      >
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          Статус
        </p>
        <p
          className="text-sm mt-1"
          style={{
            fontFamily: "var(--font-display)",
            color:      STATUS_COLOR[customer_type],
          }}
        >
          {STATUS_LABEL[customer_type]}
        </p>
      </div>

      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors"
              style={{
                color:      active ? "var(--color-ink)"   : "var(--color-ink-soft)",
                background: active ? "var(--color-bone)"  : "transparent",
                borderLeft: active ? "2px solid var(--color-coral)" : "2px solid transparent",
                marginLeft: active ? -2 : 0,
              }}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: active ? "var(--color-coral)" : "var(--color-ink-mute)" }}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ─── К каталогу ──────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <Link
          href="/katalog"
          className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase font-medium transition-colors hover:text-[var(--color-coral)]"
          style={{
            letterSpacing: "0.22em",
            color:         "var(--color-ink-mute)",
          }}
        >
          <ExternalLink className="w-3 h-3" /> К каталогу
        </Link>
      </div>

      {/* ─── Avatar + Logout ─────────────────────────────────── */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--color-line)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width:        36,
              height:       36,
              background:   "var(--color-coral)",
              color:        "#fff",
              fontFamily:   "var(--font-display)",
              fontSize:     15,
              borderRadius: "50%",
            }}
          >
            {(vorname ?? email ?? "K").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p
              className="text-sm truncate"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--color-ink)",
              }}
            >
              {vorname ?? "Клиент"}
            </p>
            <p
              className="text-[11px] truncate"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              {email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/kunde/anmelden" })}
          className="w-full flex items-center justify-center gap-2 py-2 text-[11px] uppercase font-medium transition-colors hover:text-[var(--color-coral-deep,#A53E26)]"
          style={{
            letterSpacing: "0.22em",
            background:    "var(--color-bone)",
            color:         "var(--color-ink-soft)",
          }}
        >
          <LogOut className="w-3.5 h-3.5" /> Выйти
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Hamburger ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2"
        style={{
          background: "#fff",
          border:     "1px solid var(--color-line)",
          color:      "var(--color-ink)",
        }}
        aria-label="Открыть меню"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile Backdrop ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(15, 20, 48, 0.5)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (Desktop fixed, Mobile drawer) ───────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          background:   "#fff",
          borderRight:  "1px solid var(--color-line)",
        }}
        aria-label="Меню кабинета"
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute top-3 right-3 p-2 z-10"
            style={{ color: "var(--color-ink-mute)" }}
            aria-label="Закрыть меню"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {Inhalt}
      </aside>
    </>
  );
}
