"use client";

import { useActionState } from "react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { profilSpeichernAction } from "./actions";
import type { Customer, Address } from "@/types/commerce";

export function ProfilFormular({ customer }: { customer: Customer }) {
  const [state, formAction, isPending] = useActionState(profilSpeichernAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];
  const billing = (customer.billing_address ?? {}) as Address;

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok && (
        <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-4 h-4" /> Профиль сохранён.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Личные данные</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Имя"     name="vorname"  defaultValue={customer.vorname ?? ""}  required error={e("vorname")} />
          <Input label="Фамилия" name="nachname" defaultValue={customer.nachname ?? ""} required error={e("nachname")} />
        </div>
        <Input label="E-mail" value={customer.email} disabled hint="E-mail изменить нельзя" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Телефон" name="telefon" defaultValue={customer.telefon ?? ""} placeholder="+7 700 000 00 00" />
          <Input label="Дата рождения" name="geburtsdatum" type="date" defaultValue={customer.geburtsdatum ?? ""} hint="Для промокода ко дню рождения" />
        </div>
      </section>

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Адрес</h2>
        <Input label="Улица, дом" name="strasse" defaultValue={billing.strasse ?? ""} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="Индекс" name="plz" defaultValue={billing.plz ?? ""} placeholder="050000" maxLength={6} />
          <div className="col-span-2">
            <Input label="Город" name="ort" defaultValue={billing.ort ?? ""} placeholder="Алматы" />
          </div>
        </div>
        <Input label="Страна (ISO)" name="land" defaultValue={billing.land ?? "KZ"} placeholder="KZ" />
      </section>

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Рассылка</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="newsletter" defaultChecked={customer.newsletter_aktiv} className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Подписаться на рассылку</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">Новинки + эксклюзивные промокоды</p>
          </div>
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Сохранить профиль</Button>
      </div>
    </form>
  );
}
