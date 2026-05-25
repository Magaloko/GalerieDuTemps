"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, ShoppingBag, UserCircle, Lock, Briefcase, Heart, LogOut, Sparkles } from "lucide-react";
import type { CustomerType } from "@/types/commerce";

interface Props {
  vorname?: string | null;
  email?:   string | null;
  customer_type: CustomerType;
}

export function KundeSidebar({ vorname, email, customer_type }: Props) {
  const pathname = usePathname();
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const istB2B = customer_type.startsWith("b2b");

  const navItems = [
    { href: "/kunde",              label: "Übersicht",     icon: LayoutDashboard, exact: true },
    { href: "/kunde/bestellungen", label: "Bestellungen",  icon: ShoppingBag,     exact: false },
    { href: "/wunschliste",        label: "Wunschliste",   icon: Heart,           exact: false },
    ...(istB2B || customer_type === "b2c"
      ? [{ href: "/kunde/b2b", label: "B2B-Status", icon: Briefcase, exact: false }]
      : []),
    { href: "/kunde/profil",       label: "Profil",        icon: UserCircle,     exact: false },
    { href: "/kunde/passwort",     label: "Passwort",      icon: Lock,           exact: false },
  ];

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-vintage-espresso text-vintage-cream"
      style={{ boxShadow: "var(--shadow-vintage-lg)" }}
    >
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 group">
          <Sparkles className="w-5 h-5 text-vintage-gold group-hover:scale-110 transition-transform" />
          <div>
            <p className="font-serif text-lg text-vintage-cream leading-tight">Galerie du Temps</p>
            <p className="text-vintage-dust text-xs tracking-wider uppercase">Mein Konto</p>
          </div>
        </Link>
      </div>

      {/* Customer-Type Badge */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-vintage-cream/60 text-[10px] font-sans uppercase tracking-widest">Status</p>
        <p className="font-serif text-vintage-gold text-sm mt-0.5">
          {customer_type === "b2c"            && "Privatkund:in"}
          {customer_type === "b2b_pending"    && "B2B – wartet"}
          {customer_type === "b2b_verified"   && "B2B – verifiziert"}
          {customer_type === "b2b_rejected"   && "B2B – abgelehnt"}
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-sans tracking-wide transition-colors ${
                active ? "bg-white/15 text-vintage-cream" : "text-vintage-cream/60 hover:bg-white/8 hover:text-vintage-cream"
              }`}
              style={{ borderRadius: "var(--radius-card)" }}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-vintage-gold" : "text-vintage-cream/50"}`} />
              <span>{label}</span>
              {active && <span className="ml-auto w-1 h-4 bg-vintage-gold rounded-full" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <Link href="/katalog" target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 text-xs font-sans tracking-widest uppercase text-vintage-cream/40 hover:text-vintage-cream/70 transition-colors"
          style={{ borderRadius: "var(--radius-card)" }}>
          <Sparkles className="w-3.5 h-3.5" /> Zum Katalog
        </Link>
      </div>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-vintage-gold/20 border border-vintage-gold/40 flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--radius-card)" }}>
            <span className="text-vintage-gold text-xs font-serif font-semibold">
              {(vorname ?? email ?? "K").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-vintage-cream text-sm font-sans truncate">{vorname ?? "Kund:in"}</p>
            <p className="text-vintage-dust text-xs truncate">{email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/kunde/anmelden" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-vintage-cream/60 hover:text-vintage-burgundy hover:bg-vintage-burgundy/10 text-xs font-sans tracking-wider uppercase transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <LogOut className="w-3.5 h-3.5" /> Abmelden
        </button>
      </div>
    </aside>
  );
}
