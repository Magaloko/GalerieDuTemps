"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Info, Building2, Banknote, CreditCard, Cookie } from "lucide-react";
import { einstellungenSpeichernAction } from "./actions";
import type { SystemEinstellungen } from "@/types/affiliate";

interface Props {
  settings: SystemEinstellungen;
  stripeSdkInstalled: boolean;
  stripeEnvSet: boolean;
}

export function EinstellungenFormular({ settings, stripeSdkInstalled, stripeEnvSet }: Props) {
  const [state, formAction, isPending] = useActionState(einstellungenSpeichernAction, null);
  const [stripeOn, setStripeOn] = useState(settings.stripe_connect_enabled);

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok && (
        <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-4 h-4" /> Настройки сохранены.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}

      {/* Firma */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center gap-2 border-b border-vintage-sand/50 pb-3">
          <Building2 className="w-4 h-4 text-vintage-gold" />
          <h2 className="font-serif text-lg text-vintage-espresso">Данные компании</h2>
        </div>
        <p className="text-xs text-vintage-dust font-sans">
          Используются в юридической информации, политике конфиденциальности и во всех PDF/e-mail.
        </p>
        <Input label="Название компании" name="firma_name" defaultValue={settings.firma_name} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Улица и номер" name="firma_strasse" defaultValue={settings.firma_strasse} />
          <Input label="Страна (ISO)" name="firma_land" defaultValue={settings.firma_land} placeholder="KZ" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Индекс"  name="firma_plz"  defaultValue={settings.firma_plz} />
          <Input label="Город"  name="firma_ort"  defaultValue={settings.firma_ort} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="E-mail"   name="firma_email"   type="email" defaultValue={settings.firma_email} />
          <Input label="Телефон"  name="firma_telefon" defaultValue={settings.firma_telefon} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Налоговый номер"  name="firma_steuer_id"  defaultValue={settings.firma_steuer_id} hint="Для счетов" />
          <Input label="VAT ID"   name="firma_ust_id"     defaultValue={settings.firma_ust_id}    hint="DE123456789" />
        </div>
        <Input label="Торговый реестр" name="firma_handelsregister" defaultValue={settings.firma_handelsregister} placeholder="например, БИН / регистрационный номер" />
      </section>

      {/* SEPA */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center gap-2 border-b border-vintage-sand/50 pb-3">
          <Banknote className="w-4 h-4 text-vintage-gold" />
          <h2 className="font-serif text-lg text-vintage-espresso">SEPA-выплаты</h2>
        </div>
        <p className="text-xs text-vintage-dust font-sans">
          Данные отправителя для SEPA XML-экспорта (pain.001.001.03). XML можно импортировать
          в банковскую программу для пакетных переводов.
        </p>
        <Input label="Имя плательщика" name="sepa_absender_name" defaultValue={settings.sepa_absender_name} required />
        <Input label="IBAN отправителя"     name="sepa_absender_iban" defaultValue={settings.sepa_absender_iban} placeholder="KZ86 125K ZT50 0410 0100" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="BIC (опционально)"  name="sepa_absender_bic" defaultValue={settings.sepa_absender_bic} placeholder="(для РК обычно не требуется)" />
          <Input label="Creditor ID (опционально)" name="sepa_creditor_id" defaultValue={settings.sepa_creditor_id} placeholder="(для РК обычно не требуется)" />
        </div>
        {!settings.sepa_absender_iban && (
          <div className="flex items-start gap-2 p-3 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>SEPA-экспорт доступен только после указания IBAN отправителя.</p>
          </div>
        )}
      </section>

      {/* Stripe Connect */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center gap-2 border-b border-vintage-sand/50 pb-3">
          <CreditCard className="w-4 h-4 text-vintage-gold" />
          <h2 className="font-serif text-lg text-vintage-espresso">Stripe Connect</h2>
        </div>
        <p className="text-xs text-vintage-dust font-sans">
          Для автоматических выплат комиссий через Stripe.
          Партнёры смогут подключить свой аккаунт Stripe.
        </p>

        {/* Status-Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-0.5 text-xs font-sans uppercase tracking-widest border ${stripeSdkInstalled ? "bg-vintage-sage/10 text-vintage-forest border-vintage-sage/30" : "bg-vintage-dust/10 text-vintage-dust border-vintage-dust/30"}`} style={{ borderRadius: "var(--radius-vintage)" }}>
            {stripeSdkInstalled ? "✓ SDK установлен" : "○ SDK отсутствует (npm i stripe)"}
          </span>
          <span className={`px-2 py-0.5 text-xs font-sans uppercase tracking-widest border ${stripeEnvSet ? "bg-vintage-sage/10 text-vintage-forest border-vintage-sage/30" : "bg-vintage-dust/10 text-vintage-dust border-vintage-dust/30"}`} style={{ borderRadius: "var(--radius-vintage)" }}>
            {stripeEnvSet ? "✓ ENV-ключи заданы" : "○ ENV-ключи отсутствуют"}
          </span>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="stripe_connect_enabled"
            defaultChecked={settings.stripe_connect_enabled}
            onChange={(e) => setStripeOn(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-vintage-gold"
          />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Активировать Stripe Connect</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">
              Партнёры увидят кнопку «Подключить Stripe» в профиле
            </p>
          </div>
        </label>

        {stripeOn && (
          <>
            <Select
              label="Режим"
              name="stripe_mode"
              defaultValue={settings.stripe_mode}
              options={[
                { value: "test", label: "Тестовый режим (sk_test_...)" },
                { value: "live", label: "Рабочий режим (sk_live_...)" },
              ]}
              hint="Автоматически определяется по STRIPE_SECRET_KEY"
            />
            <Input
              label="Publishable Key"
              name="stripe_publishable_key"
              defaultValue={settings.stripe_publishable_key}
              placeholder="pk_live_..."
              hint="Публичный ключ можно сохранить здесь. Secret Key ОБЯЗАТЕЛЬНО должен быть в ENV (STRIPE_SECRET_KEY)."
            />

            <div className="flex items-start gap-2 p-3 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans space-y-1" style={{ borderRadius: "var(--radius-vintage)" }}>
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Шаги настройки Stripe Connect:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                  <li><code className="bg-vintage-parchment px-1">npm install stripe</code></li>
                  <li>В аккаунте Stripe активировать Connect (Standard или Express)</li>
                  <li>Задать ENV: <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_CONNECT_CLIENT_ID</code>, <code>STRIPE_WEBHOOK_SECRET</code></li>
                  <li>Redirect URL в Stripe: <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/affiliate/stripe/callback</code></li>
                  <li>Раскомментировать TODO в <code>src/lib/affiliate/stripe.ts</code> и <code>/api/affiliate/stripe/callback</code></li>
                </ol>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Cookies */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center gap-2 border-b border-vintage-sand/50 pb-3">
          <Cookie className="w-4 h-4 text-vintage-gold" />
          <h2 className="font-serif text-lg text-vintage-espresso">Cookie-баннер</h2>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="cookie_banner_aktiv"
            defaultChecked={settings.cookie_banner_aktiv}
            className="mt-0.5 w-4 h-4 accent-vintage-gold"
          />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Показывать cookie-баннер</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">
              Рекомендуется всегда держать включённым для соответствия GDPR
            </p>
          </div>
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Сохранить все настройки</Button>
      </div>
    </form>
  );
}
