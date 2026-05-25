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
          <CheckCircle2 className="w-4 h-4" /> Antrag eingereicht. Wir melden uns innerhalb 1-2 Werktagen.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}
      <Input label="Firmenname" name="company_name" defaultValue={initial.company_name} required />
      <Input label="USt-IdNr." name="ust_id" defaultValue={initial.ust_id} placeholder="DE123456789" hint="Wenn keine UID: Begründung unten" />
      <Textarea label="Begründung (wenn keine UID)" name="company_note" defaultValue={initial.company_note} rows={3} placeholder="z.B. Kleinunternehmerin, Gewerbeschein-Nr., ..." />
      <Button type="submit" loading={isPending}>Antrag absenden</Button>
    </form>
  );
}
