"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { passwortAendernAction } from "./actions";

export default function PasswortAendernPage() {
  const [state, formAction, isPending] = useActionState(passwortAendernAction, null);

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso flex items-center gap-2">
          <Lock className="w-6 h-6 text-vintage-gold" /> Passwort ändern
        </h1>
      </div>

      <form action={formAction} className="bg-vintage-white border border-vintage-sand p-6 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
        {state?.ok && (
          <div className="flex items-center gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30 text-vintage-forest text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <CheckCircle2 className="w-4 h-4" /> Passwort erfolgreich geändert.
          </div>
        )}
        {state?.fehler && (
          <div className="flex items-center gap-3 p-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
            <AlertCircle className="w-4 h-4" /> {state.fehler}
          </div>
        )}

        <Input label="Aktuelles Passwort" name="altes_passwort" type="password" required autoComplete="current-password" />
        <Input label="Neues Passwort"     name="neues_passwort"  type="password" required autoComplete="new-password" hint="Mindestens 8 Zeichen" />
        <Input label="Wiederholen"        name="neues_passwort_wdh" type="password" required autoComplete="new-password" />

        <Button type="submit" loading={isPending} className="w-full justify-center">Passwort aktualisieren</Button>
      </form>
    </div>
  );
}
