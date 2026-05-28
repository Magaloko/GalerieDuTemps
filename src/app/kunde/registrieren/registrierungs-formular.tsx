"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { AlertCircle, User, Briefcase, Info } from "lucide-react";
import { customerRegistrierenAction } from "./actions";

/* ──────────────────────────────────────────────────────────────────────────
 * RegistrierungsFormular — Privat vs. Business Tabs.
 *
 * Galerie-Palette (paper-card, ink-text, coral-active). Form-Sections sind
 * Fieldsets mit Icon-Headern statt eingelassene Karten — flacher, weniger
 * Visual-Noise als die alte dark-vintage-brown Version.
 * ────────────────────────────────────────────────────────────────────────── */
export function RegistrierungsFormular({ initialTab }: { initialTab: "privat" | "business" }) {
  const [tab, setTab] = useState<"privat" | "business">(initialTab);
  const [state, formAction, isPending] = useActionState(customerRegistrierenAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="tab" value={tab} />

      {/* ─── Tab-Switcher ─────────────────────────────────── */}
      <div
        className="grid grid-cols-2 gap-1 p-1"
        style={{
          background: "var(--color-bone)",
          border:     "1px solid var(--color-line)",
        }}
      >
        <TabButton
          icon={User}
          label="Частное лицо"
          active={tab === "privat"}
          onClick={() => setTab("privat")}
        />
        <TabButton
          icon={Briefcase}
          label="Компания"
          active={tab === "business"}
          onClick={() => setTab("business")}
        />
      </div>

      {/* ─── Top-Level-Fehler ──────────────────────────────── */}
      {state?.fehler && (
        <div
          className="flex items-start gap-2.5 p-3 text-sm"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep, #A53E26)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{state.fehler}</span>
        </div>
      )}

      {/* ─── Personal Data ─────────────────────────────────── */}
      <Section icon={User} title="Личные данные">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Имя"     name="vorname"  required error={e("vorname")} />
          <Input label="Фамилия" name="nachname" required error={e("nachname")} />
        </div>
        <Input label="E-mail" name="email" type="email" required error={e("email")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Пароль"    name="passwort"     type="password" required error={e("passwort")}     hint="Минимум 8 символов" />
          <Input label="Повторите" name="passwort_wdh" type="password" required error={e("passwort_wdh")} />
        </div>
      </Section>

      {/* ─── Business-only fields ──────────────────────────── */}
      {tab === "business" && (
        <Section icon={Briefcase} title="Данные компании">
          <div
            className="flex items-start gap-2.5 p-3 text-xs"
            style={{
              background: "rgba(201,168,76,0.10)",
              border:     "1px solid rgba(201,168,76,0.35)",
              color:      "#8B6F47",
              borderLeft: "2px solid #C9A84C",
            }}
          >
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              Ваша B2B-заявка будет рассмотрена командой Galerie du Temps
              (1–2 рабочих дня). После одобрения вам будут доступны оптовые
              цены и скидки за объём.
            </p>
          </div>
          <Input
            label="Название компании"
            name="company_name"
            required
            error={e("company_name")}
          />
          <Input
            label="БИН / ИИН"
            name="ust_id"
            placeholder="123456789012"
            error={e("ust_id")}
            hint="Если нет БИН — укажите комментарий ниже"
          />
          <Textarea
            label="Комментарий (если нет БИН)"
            name="company_note"
            rows={3}
            placeholder="например: ИП, спецналоговый режим, № свидетельства ..."
            error={e("company_note")}
          />
        </Section>
      )}

      {/* ─── AGB ───────────────────────────────────────────── */}
      <label
        className="flex items-start gap-3 cursor-pointer p-3"
        style={{
          background: "var(--color-bone)",
          border:     "1px solid var(--color-line)",
        }}
      >
        <input
          type="checkbox"
          name="agb_akzeptiert"
          required
          className="mt-0.5 w-4 h-4"
          style={{ accentColor: "var(--color-coral)" }}
        />
        <span className="text-sm" style={{ color: "var(--color-ink)" }}>
          Я принимаю{" "}
          <Link
            href="/agb"
            target="_blank"
            style={{ color: "var(--color-coral)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            условия
          </Link>{" "}
          и{" "}
          <Link
            href="/datenschutz"
            target="_blank"
            style={{ color: "var(--color-coral)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            политику конфиденциальности
          </Link>
        </span>
      </label>
      {e("agb_akzeptiert") && (
        <p
          className="text-xs"
          style={{ color: "var(--color-coral-deep, #A53E26)" }}
        >
          {e("agb_akzeptiert")}
        </p>
      )}

      <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
        {tab === "business" ? "Подать B2B-заявку" : "Создать аккаунт"}
      </Button>
    </form>
  );
}

/* ── Sub-Components ──────────────────────────────────────────────────── */

function TabButton({
  icon: Icon, label, active, onClick,
}: {
  icon:    React.ElementType;
  label:   string;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase font-medium transition-colors"
      style={{
        letterSpacing: "0.22em",
        background:    active ? "#fff" : "transparent",
        color:         active ? "var(--color-ink)" : "var(--color-ink-mute)",
        border:        active ? "1px solid var(--color-line)" : "1px solid transparent",
        cursor:        "pointer",
        minHeight:     40,
      }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: active ? "var(--color-coral)" : "var(--color-ink-mute)" }} />
      {label}
    </button>
  );
}

function Section({
  icon: Icon, title, children,
}: {
  icon:     React.ElementType;
  title:    string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend
        className="flex items-center gap-2 pb-3 w-full text-[11px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          color:         "var(--color-ink)",
          borderBottom:  "1px solid var(--color-line)",
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
