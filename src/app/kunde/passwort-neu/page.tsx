"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { passwortNeuSetzenAction } from "../passwort-vergessen/actions";

export default function PasswortNeuPage() {
  const sp = useSearchParams();
  const [token, setToken] = useState("");
  const [state, formAction, isPending] = useActionState(passwortNeuSetzenAction, null);

  useEffect(() => { setToken(sp.get("token") ?? ""); }, [sp]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-vintage-espresso texture-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <KeyRound className="w-6 h-6 text-vintage-gold mx-auto mb-2" />
          <h1 className="font-serif text-3xl text-vintage-cream">Новый пароль</h1>
        </div>

        <form action={formAction} className="bg-vintage-brown border border-vintage-sand/40 p-8 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
          <input type="hidden" name="token" value={token} />

          {state?.ok ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-vintage-sage mx-auto" />
              <p className="font-serif text-vintage-cream">Пароль установлен!</p>
              <Link href="/kunde/anmelden" className="inline-block px-5 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
                Войти
              </Link>
            </div>
          ) : (
            <>
              {state?.fehler && (
                <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
                  <AlertCircle className="w-4 h-4" /> {state.fehler}
                </div>
              )}
              <Input label="Новый пароль" name="neues_passwort" type="password" required autoComplete="new-password" hint="Минимум 8 символов" />
              <Input label="Повторите" name="wdh" type="password" required autoComplete="new-password" />
              <Button type="submit" loading={isPending} disabled={!token} className="w-full justify-center">Установить пароль</Button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
