"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { AlertCircle, User, Briefcase, Info } from "lucide-react";
import { customerRegistrierenAction } from "./actions";

export function RegistrierungsFormular({ initialTab }: { initialTab: "privat" | "business" }) {
  const [tab, setTab]   = useState<"privat" | "business">(initialTab);
  const [state, formAction, isPending] = useActionState(customerRegistrierenAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="bg-vintage-white border border-vintage-sand p-8 space-y-6" style={{ borderRadius: "var(--radius-card)" }}>
      <input type="hidden" name="tab" value={tab} />

      {/* Tab-Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-vintage-cream border border-vintage-sand" style={{ borderRadius: "var(--radius-vintage)" }}>
        <button
          type="button"
          onClick={() => setTab("privat")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-sans uppercase tracking-widest transition-colors ${
            tab === "privat" ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:text-vintage-brown"
          }`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <User className="w-3.5 h-3.5" /> Частное лицо
        </button>
        <button
          type="button"
          onClick={() => setTab("business")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-sans uppercase tracking-widest transition-colors ${
            tab === "business" ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:text-vintage-brown"
          }`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Briefcase className="w-3.5 h-3.5" /> Компания
        </button>
      </div>

      {state?.fehler && (
        <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {state.fehler}
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="font-serif text-base text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Личные данные
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Имя"     name="vorname"  required error={e("vorname")} />
          <Input label="Фамилия" name="nachname" required error={e("nachname")} />
        </div>
        <Input label="E-mail" name="email" type="email" required error={e("email")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Пароль"      name="passwort"     type="password" required error={e("passwort")} hint="Минимум 8 символов" />
          <Input label="Повторите"   name="passwort_wdh" type="password" required error={e("passwort_wdh")} />
        </div>
      </fieldset>

      {tab === "business" && (
        <fieldset className="space-y-4">
          <legend className="font-serif text-base text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
            Данные компании
          </legend>
          <div className="flex items-start gap-3 p-3 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>
              Ваша B2B-заявка будет рассмотрена командой Galerie du Temps (1–2 рабочих дня).
              После одобрения вам будут доступны оптовые цены и скидки за объём.
            </p>
          </div>
          <Input label="Название компании" name="company_name" required error={e("company_name")} />
          <Input label="БИН / ИИН" name="ust_id" placeholder="123456789012" error={e("ust_id")} hint="Если нет БИН — укажите комментарий ниже" />
          <Textarea
            label="Комментарий (если нет БИН)"
            name="company_note"
            rows={3}
            placeholder="например: ИП, спецналоговый режим, № свидетельства ..."
            error={e("company_note")}
          />
        </fieldset>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="agb_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
        <span className="text-sm font-sans text-vintage-ink">
          Я принимаю <Link href="/agb" target="_blank" className="text-vintage-brown underline">условия</Link>{" "}
          и <Link href="/datenschutz" target="_blank" className="text-vintage-brown underline">политику конфиденциальности</Link>
        </span>
      </label>
      {e("agb_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("agb_akzeptiert")}</p>}

      <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
        {tab === "business" ? "Подать B2B-заявку" : "Создать аккаунт"}
      </Button>
    </form>
  );
}
