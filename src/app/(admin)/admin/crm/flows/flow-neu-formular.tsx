"use client";

import { useActionState } from "react";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { flowCreateAction } from "./actions";

export function FlowNeuFormular() {
  const [state, formAction, isPending] = useActionState(flowCreateAction, null);

  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Neuer Drip-Flow
      </summary>

      <form action={formAction} className="mt-5 space-y-4">
        {state?.ok && (
          <div className="flex items-center gap-2 p-3 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <CheckCircle2 className="w-4 h-4" /> Flow erstellt.
          </div>
        )}
        {state?.fehler && (
          <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertCircle className="w-4 h-4" /> {state.fehler}
          </div>
        )}

        <Input label="Name" name="name" required placeholder="z.B. Welcome-Sequenz" />
        <Textarea label="Beschreibung" name="beschreibung" rows={2} />
        <Select label="Trigger" name="trigger_typ" required options={[
          { value: "signup",        label: "Bei Customer-Signup" },
          { value: "first_order",   label: "Nach erster Bestellung" },
          { value: "b2b_approved",  label: "Bei B2B-Freischaltung" },
          { value: "winback",       label: "Win-Back (60+ Tage inaktiv)" },
          { value: "tag_added",     label: "Bei Tag-Zuweisung" },
          { value: "manual",        label: "Manuell" },
        ]} />
        <Input label="Trigger-Parameter (optional)" name="trigger_param" placeholder="z.B. Tag-ID bei tag_added" />

        <div className="flex justify-end">
          <Button type="submit" loading={isPending}>Flow erstellen</Button>
        </div>
      </form>
    </details>
  );
}
