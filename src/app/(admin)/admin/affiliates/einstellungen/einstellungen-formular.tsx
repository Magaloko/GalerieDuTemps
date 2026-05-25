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
          <CheckCircle2 className="w-4 h-4" /> Einstellungen gespeichert.
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
          Provisionssätze
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Ebene 1 (%)"
            name="provision_ebene_1_prozent"
            type="number"
            step="0.5"
            min="0" max="50"
            defaultValue={settings.provision_ebene_1_prozent}
            hint="Direkt-Provision"
          />
          <Input
            label="Ebene 2 (%)"
            name="provision_ebene_2_prozent"
            type="number"
            step="0.5"
            min="0" max="20"
            defaultValue={settings.provision_ebene_2_prozent}
            hint="Sponsor-Provision"
          />
          <Input
            label="Ebene 3 (%)"
            name="provision_ebene_3_prozent"
            type="number"
            step="0.5"
            min="0" max="10"
            defaultValue={settings.provision_ebene_3_prozent}
            onChange={(e) => setEbene3(parseFloat(e.target.value) || 0)}
            hint="0 = deaktiviert"
          />
        </div>

        {ebene3 > 0 && (
          <div className="flex items-start gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertTriangle className="w-4 h-4 text-vintage-burgundy flex-shrink-0 mt-0.5" />
            <p className="text-xs text-vintage-burgundy font-sans">
              <strong>Rechtlicher Hinweis:</strong> 3+ Provisionsebenen können in Deutschland
              als Schneeballsystem (§16 UWG) eingestuft werden. Stelle sicher, dass die
              Provisionen ausschließlich an reale Produktverkäufe gekoppelt sind und niemals
              an reine Anwerbung.
            </p>
          </div>
        )}
      </section>

      {/* Tracking + Auszahlung */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Tracking & Auszahlung
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Cookie-TTL (Tage)"
            name="cookie_ttl_tage"
            type="number"
            min="1" max="365"
            defaultValue={settings.cookie_ttl_tage}
          />
          <Input
            label="Mindestauszahlung (€)"
            name="mindestauszahlung_eur"
            type="number"
            step="1"
            min="0"
            defaultValue={settings.mindestauszahlung_cent / 100}
          />
          <Input
            label="Widerrufsfrist (Tage)"
            name="widerrufs_frist_tage"
            type="number"
            min="0" max="60"
            defaultValue={settings.widerrufs_frist_tage}
            hint="Vor Bestätigung"
          />
        </div>
      </section>

      {/* Registrierung */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Registrierung
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="registrierung_offen"
            defaultChecked={settings.registrierung_offen}
            className="mt-0.5 w-4 h-4 accent-vintage-gold"
          />
          <div>
            <span className="text-sm font-sans text-vintage-ink">Neue Registrierungen erlauben</span>
            <p className="text-xs text-vintage-dust font-sans mt-0.5">
              Wenn deaktiviert, sehen Besucher einen Hinweis statt des Registrierungs-Formulars
            </p>
          </div>
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>Einstellungen speichern</Button>
      </div>
    </form>
  );
}
