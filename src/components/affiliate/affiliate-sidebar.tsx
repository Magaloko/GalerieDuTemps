"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Link2,
  Coins,
  Users,
  Wallet,
  UserCircle,
  Megaphone,
  LogOut,
  Sparkles,
} from "lucide-react";

const NAV = [
  { href: "/affiliate",              label: "Обзор",          icon: LayoutDashboard, exact: true  },
  { href: "/affiliate/links",        label: "Мои ссылки",     icon: Link2,           exact: false },
  { href: "/affiliate/provisionen",  label: "Комиссии",       icon: Coins,           exact: false },
  { href: "/affiliate/downline",     label: "Мои партнёры",   icon: Users,           exact: false },
  { href: "/affiliate/auszahlungen", label: "Выплаты",        icon: Wallet,          exact: false },
  { href: "/affiliate/marketing",    label: "Маркетинг",      icon: Megaphone,       exact: false },
  { href: "/affiliate/profil",       label: "Профиль",        icon: UserCircle,     exact: false },
];

interface Props {
  userName?:      string | null;
  userEmail?:     string | null;
  referralCode?:  string;
}

export function AffiliateSidebar({ userName, userEmail, referralCode }: Props) {
  const pathname = usePathname();
  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-vintage-espresso text-vintage-cream border-r border-vintage-espresso/80"
      style={{ boxShadow: "var(--shadow-vintage-lg)" }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 group">
          <Sparkles className="w-5 h-5 text-vintage-gold group-hover:scale-110 transition-transform" />
          <div>
            <p className="font-serif text-lg text-vintage-cream leading-tight">Galerie du Temps</p>
            <p className="text-vintage-dust text-xs tracking-wider uppercase">Партнёрский кабинет</p>
          </div>
        </Link>
      </div>

      {/* Referral Code */}
      {referralCode && (
        <div className="px-4 py-3 border-b border-white/10 bg-vintage-gold/10">
          <p className="text-vintage-cream/60 text-[10px] font-sans uppercase tracking-widest">Ваш код</p>
          <p className="font-mono text-vintage-gold text-base mt-0.5 tracking-widest">{referralCode}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-sans tracking-wide transition-colors ${
                active
                  ? "bg-white/15 text-vintage-cream"
                  : "text-vintage-cream/60 hover:bg-white/8 hover:text-vintage-cream"
              }`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-vintage-gold" : "text-vintage-cream/50"}`} />
              <span>{label}</span>
              {active && <span className="ml-auto w-1 h-4 bg-vintage-gold rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Zur Hauptseite */}
      <div className="px-3 pb-2">
        <Link href="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 text-xs font-sans tracking-widest uppercase text-vintage-cream/40 hover:text-vintage-cream/70 transition-colors"
          style={{ borderRadius: "var(--radius-card)" }}>
          <Sparkles className="w-3.5 h-3.5" /> На главную
        </Link>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-vintage-gold/20 border border-vintage-gold/40 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--radius-card)" }}>
            <span className="text-vintage-gold text-xs font-serif font-semibold">
              {(userName ?? userEmail ?? "P").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-vintage-cream text-sm font-sans truncate">{userName ?? "Партнёр"}</p>
            <p className="text-vintage-dust text-xs truncate">{userEmail ?? ""}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/affiliate/anmelden" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-vintage-cream/60 hover:text-vintage-burgundy hover:bg-vintage-burgundy/10 text-xs font-sans tracking-wider uppercase transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <LogOut className="w-3.5 h-3.5" /> Выйти
        </button>
      </div>
    </aside>
  );
}
