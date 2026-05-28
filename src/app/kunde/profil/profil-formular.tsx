"use client";

import { useActionState } from "react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, User, MapPin, Mail } from "lucide-react";
import { profilSpeichernAction } from "./actions";
import type { Customer, Address } from "@/types/commerce";

export function ProfilFormular({ customer }: { customer: Customer }) {
  const [state, formAction, isPending] = useActionState(profilSpeichernAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];
  const billing = (customer.billing_address ?? {}) as Address;

  return (
    <form action={formAction} className="space-y-6">

      {/* Flash-Notifications */}
      {state?.ok && (
        <div
          className="flex items-center gap-3 p-4 text-sm"
          style={{
            background: "rgba(127,140,90,0.10)",
            border:     "1px solid rgba(127,140,90,0.35)",
            color:      "#52663F",
          }}
        >
          <CheckCircle2 className="w-4 h-4" /> Профиль сохранён.
        </div>
      )}
      {state?.fehler && (
        <div
          className="flex items-center gap-3 p-4 text-sm"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep, #A53E26)",
          }}
        >
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}

      {/* Personal data */}
      <Section icon={User} title="Личные данные">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Имя"     name="vorname"  defaultValue={customer.vorname ?? ""}  required error={e("vorname")} />
          <Input label="Фамилия" name="nachname" defaultValue={customer.nachname ?? ""} required error={e("nachname")} />
        </div>
        <Input label="E-mail" value={customer.email} disabled hint="E-mail изменить нельзя" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Телефон" name="telefon" defaultValue={customer.telefon ?? ""} placeholder="+7 700 000 00 00" />
          <Input label="Дата рождения" name="geburtsdatum" type="date" defaultValue={customer.geburtsdatum ?? ""} hint="Для промокода ко дню рождения" />
        </div>
      </Section>

      {/* Adresse */}
      <Section icon={MapPin} title="Адрес">
        <Input label="Улица, дом" name="strasse" defaultValue={billing.strasse ?? ""} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Индекс" name="plz" defaultValue={billing.plz ?? ""} placeholder="050000" maxLength={6} />
          <div className="sm:col-span-2">
            <Input label="Город" name="ort" defaultValue={billing.ort ?? ""} placeholder="Алматы" />
          </div>
        </div>
        <Input label="Страна (ISO)" name="land" defaultValue={billing.land ?? "KZ"} placeholder="KZ" />
      </Section>

      {/* Newsletter */}
      <Section icon={Mail} title="Рассылка">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            name="newsletter"
            defaultChecked={customer.newsletter_aktiv}
            className="mt-1 w-4 h-4"
            style={{ accentColor: "var(--color-coral)" }}
          />
          <div>
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--color-ink)",
              }}
            >
              Подписаться на рассылку
            </span>
            <p
              className="text-[11px] mt-0.5"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              Новинки + эксклюзивные промокоды
            </p>
          </div>
        </label>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Сохранить профиль</Button>
      </div>
    </form>
  );
}

function Section({
  icon: Icon, title, children,
}: {
  icon:    React.ElementType;
  title:   string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="p-6 space-y-4"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <h2
        className="flex items-center gap-2 pb-3 text-[11px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          color:         "var(--color-ink)",
          borderBottom:  "1px solid var(--color-line)",
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
        {title}
      </h2>
      {children}
    </section>
  );
}
