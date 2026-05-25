"use client";

import { useActionState } from "react";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";
import { registrierenAction } from "./actions";

export function RegistrierungsFormular({
  sponsorCodeVorbelegt,
}: { sponsorCodeVorbelegt?: string }) {
  const [state, formAction, isPending] = useActionState(registrierenAction, null);
  const e = (field: string) => state?.errors?.[field]?.[0];

  return (
    <form
      action={formAction}
      className="bg-vintage-white border border-vintage-sand p-8 space-y-6"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      {state?.fehler && (
        <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {state.fehler}
        </div>
      )}

      {/* Persönliche Daten */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Persönliche Daten
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Vorname"  name="vorname"  required error={e("vorname")}  />
          <Input label="Nachname" name="nachname" required error={e("nachname")} />
        </div>
        <Input label="E-Mail" name="email" type="email" required error={e("email")} hint="Wird auch als Login verwendet" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Passwort" name="passwort" type="password" required error={e("passwort")} hint="Min. 8 Zeichen" />
          <Input label="Passwort wiederholen" name="passwort_wdh" type="password" required error={e("passwort_wdh")} />
        </div>
      </fieldset>

      {/* Sponsor */}
      <fieldset className="space-y-2">
        <legend className="font-serif text-lg text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Wer hat dich geworben? (optional)
        </legend>
        <Input
          label="Sponsor-Code"
          name="sponsor_code"
          defaultValue={sponsorCodeVorbelegt}
          error={e("sponsor_code")}
          placeholder="z.B. ABC123XY"
          hint="Wenn dich jemand empfohlen hat, gib hier dessen Code ein"
        />
      </fieldset>

      {/* Steuerstatus */}
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Steuer-Status (Pflicht)
        </legend>
        <div className="flex items-start gap-3 p-4 bg-vintage-gold/5 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
          <Info className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
          <p>
            Provisionen sind steuerpflichtige Einnahmen. Du musst entweder ein Gewerbe
            angemeldet haben oder die Kleinunternehmer-Regelung (§19 UStG) nutzen.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="ist_kleinunternehmer" className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-ink">
            Ich nutze die <strong>Kleinunternehmer-Regelung</strong> (§19 UStG)
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="gewerbe_angemeldet" className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-ink">
            Ich habe ein <strong>Gewerbe</strong> angemeldet
          </span>
        </label>
        {e("gewerbe_angemeldet") && (
          <p className="text-xs text-vintage-burgundy font-sans">{e("gewerbe_angemeldet")}</p>
        )}
      </fieldset>

      {/* Rechtliches */}
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg text-vintage-espresso pb-2 border-b border-vintage-sand w-full">
          Rechtliches
        </legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="agb_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-ink">
            Ich akzeptiere die <a href="/affiliate/agb" target="_blank" className="text-vintage-brown underline">Partner-AGB</a>
          </span>
        </label>
        {e("agb_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("agb_akzeptiert")}</p>}

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="datenschutz_akzeptiert" required className="mt-0.5 w-4 h-4 accent-vintage-gold" />
          <span className="text-sm font-sans text-vintage-ink">
            Ich akzeptiere die <a href="/datenschutz" target="_blank" className="text-vintage-brown underline">Datenschutzerklärung</a>
          </span>
        </label>
        {e("datenschutz_akzeptiert") && <p className="text-xs text-vintage-burgundy font-sans">{e("datenschutz_akzeptiert")}</p>}
      </fieldset>

      <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
        Account erstellen
      </Button>
    </form>
  );
}
