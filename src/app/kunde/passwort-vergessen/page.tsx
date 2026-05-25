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
    <main className="min-h-screen flex items-center justify-center bg-vintage-espresso texture-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <KeyRound className="w-6 h-6 text-vintage-gold mx-auto mb-2" />
          <h1 className="font-serif text-3xl text-vintage-cream">Забыли пароль</h1>
        </div>

        <form action={formAction} className="bg-vintage-brown border border-vintage-sand/40 p-8 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
          {state?.ok ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-vintage-sage mx-auto" />
              <p className="font-serif text-vintage-cream">Письмо отправлено</p>
              <p className="text-vintage-dust text-sm font-sans">
                Если аккаунт с этим e-mail существует, вы скоро получите ссылку для сброса пароля.
              </p>
            </div>
          ) : (
            <>
              {state?.fehler && (
                <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-sm font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
                  <AlertCircle className="w-4 h-4" /> {state.fehler}
                </div>
              )}
              <p className="text-sm text-vintage-cream/80 font-sans">
                Введите ваш e-mail. Мы отправим ссылку для установки нового пароля.
              </p>
              <Input label="E-mail" name="email" type="email" required autoFocus />
              <Button type="submit" loading={isPending} className="w-full justify-center">Отправить ссылку</Button>
            </>
          )}
        </form>

        <p className="text-center mt-6">
          <Link href="/kunde/anmelden" className="text-vintage-dust text-xs hover:text-vintage-cream/80 transition-colors">
            ← К входу
          </Link>
        </p>
      </div>
    </main>
  );
}
