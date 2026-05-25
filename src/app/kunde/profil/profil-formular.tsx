"use client";

import { useActionState } from "react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { profilSpeichernAction } from "./actions";
import type { Customer, Address } from "@/types/commerce";

export function ProfilFormular({ customer }: { customer: Customer }) {
  const [state, formAction, isPending] = useActionState(profilSpeichernAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];
  const billing = (customer.billing_address ?? {}) as Address;

  return (
    <form action={formAction} className="space-y-6">
      {state?.ok && (
        <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckCircle2 className="w-4 h-4" /> Profil gespeichert.
        </div>
      )}
      {state?.fehler && (
        <div className="flex items-center gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Stammdaten</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Vorname"  name="vorname"  defaultValue={customer.vorname ?? ""}  required error={e("vorname")} />
          <Input label="Nachname" name="nachname" defaultValue={customer.nachname ?? ""} required error={e("nachname")} />
        </div>
        <Input label="E-Mail" value={customer.email} disabled hint="E-Mail kann nicht geändert werden" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Telefon" name="telefon" defaultValue={customer.telefon ?? ""} />
          <Input label="Geburtsdatum" name="geburtsdatum" type="date" defaultValue={customer.geburtsdatum ?? ""} hint="Für Geburtstags-Coupons" />
        </div>
      </section>

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Adresse</h2>
        <Input label="Straße + Nr." name="strasse" defaultValue={billing.strasse ?? ""} />
        <div className="grid grid-cols-3 gap-4">
          <Input label="PLZ" name="plz" defaultValue={billing.plz ?? ""} />
          <div className="col-span-2">
            <Input label="Ort" name="ort" defaultValue={billing.ort ?? ""} />
          </div>
        </div>
        <Input label="Land (ISO)" name="land" defaultValue={billing.land ?? "DE"} placeholder="DE" />
      </section>

      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">Marketing</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="newsletter" defaultChecked={customer.newsletter_aktiv} className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Newsletter abonnieren</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">Aktuelle Stücke + exklusive Coupons</p>
          </div>
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Profil speichern</Button>
      </div>
    </form>
  );
}
