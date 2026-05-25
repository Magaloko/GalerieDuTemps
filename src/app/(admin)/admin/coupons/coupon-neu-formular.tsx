"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { couponErstellenAction } from "./actions";

export function CouponNeuFormular() {
  const [state, formAction, isPending] = useActionState(couponErstellenAction, null);

  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Neuen Coupon erstellen
      </summary>

      <form action={formAction} className="mt-5 space-y-4">
        {state?.ok && (
          <div className="flex items-center gap-2 p-3 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <CheckCircle2 className="w-4 h-4" /> Coupon erstellt.
          </div>
        )}
        {state?.fehler && (
          <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertCircle className="w-4 h-4" /> {state.fehler}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Code" name="code" required placeholder="SOMMER20" />
          <Input label="Beschreibung" name="beschreibung" placeholder="Sommer-Aktion" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select label="Typ" name="typ" required options={[
            { value: "prozent", label: "Prozent (%)" },
            { value: "fest",    label: "Festbetrag (€)" },
          ]} />
          <Input label="Wert" name="wert" type="number" step="0.01" required placeholder="20" />
          <Input label="Min.-Bestellwert (€)" name="min_bestellwert_eur" type="number" step="0.01" defaultValue="0" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Max. Nutzungen gesamt" name="nutzungen_max" type="number" placeholder="100" hint="leer = unbegrenzt" />
          <Input label="Max. pro User" name="nutzungen_pro_user" type="number" defaultValue="1" />
          <Input label="Gültig bis" name="gueltig_bis" type="date" />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="nur_b2b" className="w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-ink">Nur B2B</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="nur_b2c" className="w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-ink">Nur B2C</span>
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={isPending}>Coupon erstellen</Button>
        </div>
      </form>
    </details>
  );
}
