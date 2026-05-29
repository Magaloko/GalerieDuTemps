"use client";

import { useActionState } from "react";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { segmentCreateAction } from "./actions";
import type { PipelineStage } from "@/types/crm";

export function SegmentNeuFormular({ stages }: { stages: PipelineStage[] }) {
  const [state, formAction, isPending] = useActionState(segmentCreateAction, null);

  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Новый сегмент
      </summary>

      <form action={formAction} className="mt-5 space-y-4">
        {state?.ok && (
          <div className="flex items-center gap-2 p-3 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <CheckCircle2 className="w-4 h-4" /> Сегмент сохранён.
          </div>
        )}
        {state?.fehler && (
          <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertCircle className="w-4 h-4" /> {state.fehler}
          </div>
        )}

        <Input label="Название" name="name" required placeholder="Например, VIP-клиенты рассылки" />
        <Textarea label="Описание (необязательно)" name="beschreibung" rows={2} />

        <fieldset>
          <legend className="text-xs font-sans uppercase tracking-widest text-vintage-brown mb-2">Тип клиента (необязательно)</legend>
          <div className="flex flex-wrap gap-3">
            {["b2c", "b2b_verified", "b2b_pending"].map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="customer_type" value={t} className="w-4 h-4 accent-vintage-gold" />
                <span className="text-sm font-sans text-vintage-ink">{t}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown mb-1.5 block">Этап воронки</label>
            <select name="stage_id" className="w-full px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans focus:outline-none focus:border-vintage-brown" style={{ borderRadius: "var(--radius-vintage)" }}>
              <option value="">Все</option>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-sans uppercase tracking-widest text-vintage-brown mb-1.5 block">Newsletter</label>
            <select name="newsletter" className="w-full px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans focus:outline-none focus:border-vintage-brown" style={{ borderRadius: "var(--radius-vintage)" }}>
              <option value="">Любое</option>
              <option value="yes">Подписан</option>
              <option value="no">Не подписан</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Мин. заказов" name="min_orders" type="number" min="0" placeholder="0" />
          <Input label="Мин. оборот (₸)" name="min_summe_eur" type="number" step="0.01" min="0" placeholder="0" />
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={isPending}>Создать сегмент</Button>
        </div>
      </form>
    </details>
  );
}
