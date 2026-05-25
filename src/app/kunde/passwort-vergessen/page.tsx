"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { passwortVergessenAction } from "./actions";

export default function PasswortVergessenPage() {
  const [state, formAction, isPending] = useActionState(passwortVergessenAction, null);

  return (
    <main className="min-h-screen flex items-center justify-center bg-vintage-cream texture-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <KeyRound className="w-6 h-6 text-vintage-gold mx-auto mb-2" />
          <h1 className="font-serif text-3xl text-vintage-espresso">Passwort vergessen</h1>
        </div>

        <form action={formAction} className="bg-vintage-white border border-vintage-sand p-8 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
          {state?.ok ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-vintage-sage mx-auto" />
              <p className="font-serif text-vintage-espresso">E-Mail gesendet</p>
              <p className="text-vintage-dust text-sm font-sans">
                Falls ein Konto mit dieser E-Mail existiert, erhältst du in Kürze einen
                Link zum Zurücksetzen.
              </p>
            </div>
          ) : (
            <>
              {state?.fehler && (
                <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
                  <AlertCircle className="w-4 h-4" /> {state.fehler}
                </div>
              )}
              <p className="text-sm text-vintage-brown font-sans">
                Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, um ein neues
                Passwort zu setzen.
              </p>
              <Input label="E-Mail" name="email" type="email" required autoFocus />
              <Button type="submit" loading={isPending} className="w-full justify-center">Link senden</Button>
            </>
          )}
        </form>

        <p className="text-center mt-6">
          <Link href="/kunde/anmelden" className="text-vintage-dust text-xs hover:text-vintage-brown transition-colors">
            ← Zur Anmeldung
          </Link>
        </p>
      </div>
    </main>
  );
}
