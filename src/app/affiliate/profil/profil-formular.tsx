"use client";

import { useActionState, useState } from "react";
import { Input }    from "@/components/ui/input";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { profilAktualisierenAction } from "./actions";
import type { Affiliate, AuszahlungsMethode } from "@/types/affiliate";
import { formatTelefon } from "@/lib/kz/validate";

export function ProfilFormular({ affiliate }: { affiliate: Affiliate }) {
  const [state, formAction, isPending] = useActionState(profilAktualisierenAction, null);
  const [methode, setMethode] = useState<AuszahlungsMethode>(affiliate.auszahlungs_methode);
  const [kaspiTel, setKaspiTel] = useState(affiliate.kaspi_telefon ? formatTelefon(affiliate.kaspi_telefon) : "");
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok && (
        <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Профиль успешно сохранён.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {state.fehler}
        </div>
      )}

      {/* Stammdaten */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-cream border-b border-vintage-sand/30 pb-3">Личные данные</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Имя"     name="vorname"  defaultValue={affiliate.vorname}  required error={e("vorname")} />
          <Input label="Фамилия" name="nachname" defaultValue={affiliate.nachname} required error={e("nachname")} />
        </div>
        <Input label="E-mail" value={affiliate.email} disabled hint="E-mail изменить нельзя" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Реферальный код" value={affiliate.referral_code} disabled />
          <Input label="Член с" value={new Date(affiliate.erstellt_am).toLocaleDateString("ru-RU")} disabled />
        </div>
      </section>

      {/* Auszahlung */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-cream border-b border-vintage-sand/30 pb-3">Выплата вознаграждения</h2>

        <Select
          label="Способ выплаты"
          name="auszahlungs_methode"
          required
          value={methode}
          onChange={(ev) => setMethode(ev.target.value as AuszahlungsMethode)}
          options={[
            { value: "kaspi",        label: "Kaspi.kz (рекомендуется)"     },
            { value: "iic_transfer", label: "Банковский перевод (ИИК/БИК)" },
            { value: "paypal",       label: "PayPal"                       },
            { value: "sepa",         label: "SEPA-перевод (EU)"            },
          ]}
        />

        {methode === "kaspi" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-[#F14635]/5 border border-[#F14635]/30 text-vintage-cream/80 text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
              <Info className="w-3.5 h-3.5 text-[#F14635] flex-shrink-0 mt-0.5" />
              <p>Выплата через Kaspi Gold — самый быстрый и привычный способ в Казахстане.</p>
            </div>
            <Input
              label="Номер Kaspi (+7)"
              name="kaspi_telefon"
              type="tel"
              value={kaspiTel}
              onChange={(ev) => setKaspiTel(formatTelefon(ev.target.value))}
              placeholder="+7 700 000 00 00"
              hint="Тот же номер, что и в приложении Kaspi.kz"
              error={e("kaspi_telefon")}
              required
            />
          </div>
        )}

        {methode === "iic_transfer" && (
          <div className="space-y-4">
            <Input
              label="ИИК (номер счёта)"
              name="iic"
              defaultValue={affiliate.iic ?? ""}
              placeholder="KZ123456789012345678"
              hint="20 символов: KZ + 18 цифр"
              maxLength={20}
              required
              error={e("iic")}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="БИК банка"
                name="bik"
                defaultValue={affiliate.bik ?? ""}
                placeholder="HSBKKZKX"
                hint="8 символов (например HSBKKZKX — Halyk Bank)"
                maxLength={8}
                required
                error={e("bik")}
              />
              <Input
                label="Получатель"
                name="kontoinhaber"
                defaultValue={affiliate.kontoinhaber ?? ""}
                placeholder="Иванов Иван Иванович"
                error={e("kontoinhaber")}
              />
            </div>
          </div>
        )}

        {methode === "paypal" && (
          <Input
            label="PayPal e-mail"
            name="paypal_email"
            type="email"
            defaultValue={affiliate.paypal_email ?? ""}
            placeholder="paypal@example.com"
            error={e("paypal_email")}
          />
        )}

        {methode === "sepa" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-cream/80 text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
              <Info className="w-3.5 h-3.5 text-vintage-gold flex-shrink-0 mt-0.5" />
              <p>SEPA подходит только для счетов в банках ЕС. Для Казахстана используйте ИИК или Kaspi.</p>
            </div>
            <Input
              label="IBAN"
              name="iban"
              placeholder={affiliate.hat_iban ? "•••• •••• •••• •••• ••••" : "DE89 3704 0044 0532 0130 00"}
              hint={affiliate.hat_iban ? "Уже сохранён. Заполните только для замены." : "Хранится в зашифрованном виде"}
              error={e("iban")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="BIC" name="bic" defaultValue={affiliate.bic ?? ""} error={e("bic")} />
              <div className="col-span-2">
                <Input label="Получатель" name="kontoinhaber" defaultValue={affiliate.kontoinhaber ?? ""} error={e("kontoinhaber")} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Steuer / ИИН·БИН */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-cream border-b border-vintage-sand/30 pb-3">Налоговые данные</h2>
        <div className="flex items-start gap-3 p-4 bg-vintage-gold/5 border border-vintage-gold/30 text-vintage-cream/80 text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <Info className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
          <p>
            Эти данные нужны для документа выплаты. Заполните <strong>ИИН</strong>, если вы физическое лицо или ИП,
            или <strong>БИН</strong>, если ТОО / юридическое лицо.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="ИИН (физлицо / ИП)"
            name="iin_affiliate"
            defaultValue={affiliate.iin_affiliate ?? ""}
            placeholder="900101300000"
            hint="12 цифр"
            maxLength={12}
            error={e("iin_affiliate")}
          />
          <Input
            label="БИН (ТОО / юр. лицо)"
            name="bin_affiliate"
            defaultValue={affiliate.bin_affiliate ?? ""}
            placeholder="123456789012"
            hint="12 цифр"
            maxLength={12}
            error={e("bin_affiliate")}
          />
        </div>
        <Input
          label="Налоговый ID (если есть, EU)"
          name="steuer_id"
          defaultValue={affiliate.steuer_id ?? ""}
          error={e("steuer_id")}
          hint="Для нерезидентов с налоговой регистрацией в ЕС"
        />
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="gewerbe_angemeldet" defaultChecked={affiliate.gewerbe_angemeldet} className="mt-0.5 w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-cream">
              ИП / ТОО зарегистрировано (обязательно для коммерческой деятельности в РК)
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" name="ist_kleinunternehmer" defaultChecked={affiliate.ist_kleinunternehmer} className="mt-0.5 w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-cream">
              Специальный налоговый режим / §19 UStG (EU) — без НДС
            </span>
          </label>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Сохранить профиль</Button>
      </div>
    </form>
  );
}
