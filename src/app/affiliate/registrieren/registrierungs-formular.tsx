"use client";

import { useActionState } from "react";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";
import { registrierenAction } from "./actions";

export function RegistrierungsFormular({
  sponsorCodeVorbelegt,
}: { sponsorCodeVorbelegt?: string }) {
  const [state, formAction, isPending] = useActionState(registrierenAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form
      action={formAction}
      className="bg-vintage-brown border border-vintage-sand/40 p-8 space-y-6"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      {state?.fehler && (
        <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {state.fehler}
        </div>
      )}

      {/* Persönliche Daten */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg text-vintage-cream pb-2 border-b border-vintage-sand/40 w-full">
          Личные данные
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Имя"      name="vorname"  required error={e("vorname")}  />
          <Input label="Фамилия"  name="nachname" required error={e("nachname")} />
        </div>
        <Input label="E-mail" name="email" type="email" required error={e("email")} hint="Используется как логин" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Пароль" name="passwort" type="password" required error={e("passwort")} hint="Минимум 8 символов" />
          <Input label="Повторите пароль" name="passwort_wdh" type="password" required error={e("passwort_wdh")} />
        </div>
      </fieldset>

      {/* Sponsor */}
      <fieldset className="space-y-2">
        <legend className="font-serif text-lg text-vintage-cream pb-2 border-b border-vintage-sand/40 w-full">
          Кто вас пригласил? (необязательно)
        </legend>
        <Input
          label="Реферальный код"
          name="sponsor_code"
          defaultValue={sponsorCodeVorbelegt}
          error={e("sponsor_code")}
          placeholder="например, ABC123XY"
          hint="Если вас кто-то порекомендовал, введите здесь его код"
        />
      </fieldset>

      {/* Steuerstatus */}
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg text-vintage-cream pb-2 border-b border-vintage-sand/40 w-full">
          Налоговый статус (обязательно)
        </legend>
        <div className="flex items-start gap-3 p-4 bg-vintage-gold/5 border border-vintage-gold/30 text-vintage-cream/80 text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <Info className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
          <p>
            Вознаграждение облагается налогом. Вы должны быть зарегистрированы
            как ИП или ТОО в Казахстане.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="ist_kleinunternehmer" className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-cream">
            Я применяю <strong>специальный налоговый режим</strong> (без НДС)
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="gewerbe_angemeldet" className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-cream">
            Я зарегистрирован как <strong>ИП или ТОО</strong>
          </span>
        </label>
        {e("gewerbe_angemeldet") && (
          <p className="text-xs text-vintage-burgundy font-sans">{e("gewerbe_angemeldet")}</p>
        )}
      </fieldset>

      {/* Rechtliches */}
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg text-vintage-cream pb-2 border-b border-vintage-sand/40 w-full">
          Юридическое
        </legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="agb_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-cream">
            Я принимаю <a href="/affiliate/agb" target="_blank" className="text-vintage-cream/80 underline">Партнёрское соглашение</a>
          </span>
        </label>
        {e("agb_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("agb_akzeptiert")}</p>}

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="datenschutz_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-cream">
            Я принимаю <a href="/datenschutz" target="_blank" className="text-vintage-cream/80 underline">Политику конфиденциальности</a>
          </span>
        </label>
        {e("datenschutz_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("datenschutz_akzeptiert")}</p>}
      </fieldset>

      <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
        Создать аккаунт
      </Button>
    </form>
  );
}
