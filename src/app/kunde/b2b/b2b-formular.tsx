"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { b2bAntragStellenAction } from "./actions";

export function B2bAntragsFormular({
  initial,
}: { initial: { company_name: string; ust_id: string; company_note: string } }) {
  const [state, formAction, isPending] = useActionState(b2bAntragStellenAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && (
        <div className="flex items-center gap-2 p-3 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <CheckCircle2 className="w-4 h-4" /> Заявка отправлена. Мы свяжемся с вами в течение 1–2 рабочих дней.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}
      <Input label="Название компании" name="company_name" defaultValue={initial.company_name} required />
      <Input label="БИН / ИИН" name="ust_id" defaultValue={initial.ust_id} placeholder="123456789012" hint="Если нет БИН — укажите комментарий ниже" />
      <Textarea label="Комментарий (если нет БИН)" name="company_note" defaultValue={initial.company_note} rows={3} placeholder="например: ИП, спецналоговый режим, № свидетельства ..." />
      <Button type="submit" loading={isPending}>Отправить заявку</Button>
    </form>
  );
}
