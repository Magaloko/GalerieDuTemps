"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { AlertCircle, User, Briefcase, Info } from "lucide-react";
import { customerRegistrierenAction } from "./actions";

export function RegistrierungsFormular({ initialTab }: { initialTab: "privat" | "business" }) {
  const [tab, setTab]   = useState<"privat" | "business">(initialTab);
  const [state, formAction, isPending] = useActionState(customerRegistrierenAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form action={formAction} className="bg-vintage-white border border-vintage-sand p-8 space-y-6" style={{ borderRadius: "var(--radius-card)" }}>
      <input type="hidden" name="tab" value={tab} />

      {/* Tab-Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-vintage-cream border border-vintage-sand" style={{ borderRadius: "var(--radius-vintage)" }}>
        <button
          type="button"
          onClick={() => setTab("privat")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-sans uppercase tracking-widest transition-colors ${
            tab === "privat" ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:text-vintage-brown"
          }`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <User className="w-3.5 h-3.5" /> Privatkund:in
        </button>
        <button
          type="button"
          onClick={() => setTab("business")}
          className={`flex items-center justify-center gap-2 py-2.5 text-xs font-sans uppercase tracking-widest transition-colors ${
            tab === "business" ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:text-vintage-brown"
          }`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Briefcase className="w-3.5 h-3.5" /> Geschäftskund:in
        </button>
      </div>

      {state?.fehler && (
        <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {state.fehler}
        </div>
      )}

      {/* Persönliche Daten */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-base text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Persönliche Daten
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Vorname"  name="vorname"  required error={e("vorname")} />
          <Input label="Nachname" name="nachname" required error={e("nachname")} />
        </div>
        <Input label="E-Mail" name="email" type="email" required error={e("email")} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Passwort" name="passwort" type="password" required error={e("passwort")} hint="Min. 8 Zeichen" />
          <Input label="Wiederholen" name="passwort_wdh" type="password" required error={e("passwort_wdh")} />
        </div>
      </fieldset>

      {/* B2B-Felder (nur sichtbar wenn Tab=business) */}
      {tab === "business" && (
        <fieldset className="space-y-4">
          <legend className="font-serif text-base text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
            Firmendaten
          </legend>
          <div className="flex items-start gap-3 p-3 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>
              Dein B2B-Antrag wird vom Galerie du Temps Team geprüft (1-2 Werktage). Nach
              Freischaltung siehst du Großhandelspreise und Rabattstaffeln.
            </p>
          </div>
          <Input label="Firmenname" name="company_name" required error={e("company_name")} />
          <Input label="USt-IdNr." name="ust_id" placeholder="DE123456789" error={e("ust_id")} hint="Wenn keine UID: Begründung unten" />
          <Textarea
            label="Begründung (wenn keine USt-IdNr.)"
            name="company_note"
            rows={3}
            placeholder="z.B. Kleinunternehmerin, Gewerbeschein-Nr., ..."
            error={e("company_note")}
          />
        </fieldset>
      )}

      {/* Rechtliches */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="agb_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
        <span className="text-sm font-sans text-vintage-ink">
          Ich akzeptiere die <Link href="/agb" target="_blank" className="text-vintage-brown underline">AGB</Link>{" "}
          und die <Link href="/datenschutz" target="_blank" className="text-vintage-brown underline">Datenschutzerklärung</Link>
        </span>
      </label>
      {e("agb_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("agb_akzeptiert")}</p>}

      <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
        {tab === "business" ? "B2B-Antrag stellen" : "Konto erstellen"}
      </Button>
    </form>
  );
}
