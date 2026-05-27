"use client";

import { useActionState, useState } from "react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { einstellungenSpeichernAction } from "./actions";
import type { AffiliateEinstellungen } from "@/types/affiliate";

export function EinstellungenFormular({ settings }: { settings: AffiliateEinstellungen }) {
  const [state, formAction, isPending] = useActionState(einstellungenSpeichernAction, null);
  const [ebene3, setEbene3] = useState(settings.provision_ebene_3_prozent);

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

      {/* Provisionssätze */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Ставки комиссий
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Уровень 1 (%)"
            name="provision_ebene_1_prozent"
            type="number"
            step="0.5"
            min="0" max="50"
            defaultValue={settings.provision_ebene_1_prozent}
            hint="Прямая комиссия"
          />
          <Input
            label="Уровень 2 (%)"
            name="provision_ebene_2_prozent"
            type="number"
            step="0.5"
            min="0" max="20"
            defaultValue={settings.provision_ebene_2_prozent}
            hint="Комиссия спонсора"
          />
          <Input
            label="Уровень 3 (%)"
            name="provision_ebene_3_prozent"
            type="number"
            step="0.5"
            min="0" max="10"
            defaultValue={settings.provision_ebene_3_prozent}
            onChange={(e) => setEbene3(parseFloat(e.target.value) || 0)}
            hint="0 = отключено"
          />
        </div>

        {ebene3 > 0 && (
          <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertTriangle className="w-4 h-4 text-vintage-burgundy flex-shrink-0 mt-0.5" />
            <p className="text-xs text-vintage-burgundy font-sans">
              <strong>Юридическое примечание:</strong> 3+ уровня комиссий в Германии
              могут классифицироваться как финансовая пирамида (§16 UWG). Убедитесь, что
              комиссии привязаны только к реальным продажам товаров и никогда
              не начисляются за одно лишь привлечение.
            </p>
          </div>
        )}
      </section>

      {/* Tracking + Auszahlung */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Трекинг и выплаты
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Cookie TTL (дни)"
            name="cookie_ttl_tage"
            type="number"
            min="1" max="365"
            defaultValue={settings.cookie_ttl_tage}
          />
          <Input
            label="Минимальная выплата (€)"
            name="mindestauszahlung_eur"
            type="number"
            step="1"
            min="0"
            defaultValue={settings.mindestauszahlung_cent / 100}
          />
          <Input
            label="Срок отказа (дни)"
            name="widerrufs_frist_tage"
            type="number"
            min="0" max="60"
            defaultValue={settings.widerrufs_frist_tage}
            hint="До подтверждения"
          />
        </div>
      </section>

      {/* Registrierung */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Регистрация
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="registrierung_offen"
            defaultChecked={settings.registrierung_offen}
            className="mt-0.5 w-4 h-4 accent-vintage-gold"
          />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Разрешить новые регистрации</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">
              Если отключено, посетители увидят уведомление вместо формы регистрации
            </p>
          </div>
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Сохранить настройки</Button>
      </div>
    </form>
  );
}
