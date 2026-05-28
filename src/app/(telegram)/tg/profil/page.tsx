import Link from "next/link";
import { customerById } from "@/lib/db/customers";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../auth-gate";
import { ClaimInitForm } from "./claim-init-form";
import {
  User, Mail, Briefcase, Package, Heart, ExternalLink, ArrowRight, MessageCircle,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Профиль · Galerie du Temps",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  b2c:          "Частный клиент",
  b2b_pending:  "B2B · на рассмотрении",
  b2b_verified: "B2B · подтверждён",
  b2b_rejected: "B2B · отклонён",
};

const TYPE_COLOR: Record<string, string> = {
  b2c:          "var(--color-ink-mute)",
  b2b_pending:  "#C9A84C",
  b2b_verified: "#52663F",
  b2b_rejected: "var(--color-coral-deep, #A53E26)",
};

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/profil — kompaktes Profil-View für Mini-App.
 *
 * Zeigt:
 *  - Avatar-Bubble + Name + Kunden-Nummer
 *  - Customer-Type-Badge (B2C/B2B-Status)
 *  - Quick-Links: Заказы / Избранное / Профиль auf Website
 *  - Voll-Settings nur via Web (Adresse, Passwort, Telegram-Unlink etc.) —
 *    sind tief verschachtelt und wären in 414×800 Mini-App-Viewport
 *    cramped. Lieber 1-Tap zur Web-Profil-Seite.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgProfilPage() {
  const session  = await getWebAppSession();
  const customer = session?.customerId ? await customerById(session.customerId) : null;

  if (!customer) {
    return (
      <TelegramAuthGate>
        <main className="p-4 space-y-5">
          <header className="text-center pt-2">
            <p
              className="text-[10px] uppercase font-medium mb-2"
              style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
            >
              ✦ Профиль
            </p>
            <h1
              className="mb-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   24,
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              Привязать аккаунт
            </h1>
            <p
              className="text-sm max-w-sm mx-auto"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
                lineHeight: 1.5,
              }}
            >
              Введите e-mail вашего аккаунта на сайте. Мы пришлём ссылку
              для подтверждения — после клика вы увидите свои заказы
              прямо здесь.
            </p>
          </header>

          {/* Claim-Form (Client-Component, läuft initData-Auth-POST) */}
          <ClaimInitForm />

          {/* Kontakt-Link für Gäste — auch ohne Account erreichbar */}
          <Link
            href="/tg/kontakt"
            className="flex items-center gap-3 p-4"
            style={{
              background:  "var(--tg-theme-section-bg-color, #fff)",
              border:      "1px solid var(--color-line)",
              touchAction: "manipulation",
            }}
          >
            <MessageCircle className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
            <span
              className="text-sm flex-1"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              Связаться с куратором
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
          </Link>

          {/* Wenn noch kein Account auf Web */}
          <div
            className="p-4 text-center"
            style={{
              background: "var(--color-bone)",
              border:     "1px solid var(--color-line)",
            }}
          >
            <p
              className="text-xs mb-3"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
              }}
            >
              Ещё нет аккаунта на сайте?
            </p>
            <a
              href="/kunde/registrieren"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                color:         "var(--tg-theme-link-color, var(--color-coral))",
              }}
            >
              Зарегистрироваться <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </main>
      </TelegramAuthGate>
    );
  }

  return (
    <TelegramAuthGate>
      <main className="p-4 space-y-5">
        {/* ─ Avatar + Name ───────────────────────────────────── */}
        <header className="flex items-center gap-3 pb-4"
                style={{ borderBottom: "1px solid var(--color-line)" }}>
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width:        56,
              height:       56,
              background:   "var(--color-coral)",
              color:        "#fff",
              fontFamily:   "var(--font-display)",
              fontSize:     22,
              borderRadius: "50%",
            }}
          >
            {(customer.vorname ?? customer.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              ✦ Профиль
            </p>
            <h1
              className="truncate"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   20,
                color:      "var(--tg-theme-text-color, var(--color-ink))",
                lineHeight: 1.15,
              }}
            >
              {[customer.vorname, customer.nachname].filter(Boolean).join(" ") || "Клиент"}
            </h1>
            <p
              className="text-[11px] truncate"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
              }}
            >
              KD-{customer.customer_number.toString().padStart(4, "0")}
            </p>
          </div>
        </header>

        {/* ─ Meta ────────────────────────────────────────────── */}
        <section className="space-y-2">
          <MetaRow
            icon={Mail}
            label="E-mail"
            value={customer.email}
          />
          <MetaRow
            icon={Briefcase}
            label="Статус"
            value={TYPE_LABEL[customer.customer_type] ?? customer.customer_type}
            color={TYPE_COLOR[customer.customer_type]}
          />
        </section>

        {/* ─ Quick-Links ─────────────────────────────────────── */}
        <section className="space-y-2 pt-2">
          <NavRow href="/tg/orders"        icon={Package}         label="Мои заказы" />
          <NavRow href="/tg/wunschliste"   icon={Heart}           label="Избранное"   />
          <NavRow href="/tg/kontakt"       icon={MessageCircle}   label="Связаться с куратором" />
        </section>

        {/* ─ Externe Links zum Web-Profil ────────────────────── */}
        <section
          className="pt-4"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <p
            className="text-[10px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
          >
            Открыть на сайте
          </p>
          <div className="space-y-2">
            <ExternalRow href="/kunde/profil"    label="Редактировать профиль" />
            <ExternalRow href="/kunde/passwort"  label="Сменить пароль" />
            <ExternalRow href="/kunde/b2b"       label="B2B-статус" />
          </div>
        </section>
      </main>
    </TelegramAuthGate>
  );
}

/* ── Sub-Components ────────────────────────────────────────────────── */

function MetaRow({
  icon: Icon, label, value, color,
}: {
  icon:  React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{
        background: "var(--tg-theme-section-bg-color, #fff)",
        border:     "1px solid var(--color-line)",
      }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-coral)" }} />
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
        >
          {label}
        </p>
        <p
          className="text-sm truncate"
          style={{
            color: color ?? "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function NavRow({
  href, icon: Icon, label,
}: { href: string; icon: React.ElementType; label: string }) {
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
      <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
    </Link>
  );
}

function ExternalRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3"
      style={{
        background:  "var(--tg-theme-section-bg-color, #fff)",
        border:      "1px solid var(--color-line)",
        touchAction: "manipulation",
      }}
    >
      <span
        className="text-sm flex-1"
        style={{
          fontFamily: "var(--font-display)",
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        {label}
      </span>
      <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
    </a>
  );
}
