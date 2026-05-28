"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { passwortNeuSetzenAction } from "../passwort-vergessen/actions";

export default function PasswortNeuPage() {
  const sp = useSearchParams();
  const [token, setToken] = useState("");
  const [state, formAction, isPending] = useActionState(passwortNeuSetzenAction, null);

  useEffect(() => { setToken(sp.get("token") ?? ""); }, [sp]);

  if (state?.ok) {
    return (
      <AuthShell eyebrow="Безопасность" titel="Пароль установлен">
        <div className="text-center space-y-4">
          <div
            className="inline-flex items-center justify-center"
            style={{
              width:        56,
              height:       56,
              background:   "rgba(127,140,90,0.12)",
              border:       "1px solid rgba(127,140,90,0.40)",
              borderRadius: "50%",
            }}
          >
            <CheckCircle2 className="w-7 h-7" style={{ color: "#52663F" }} />
          </div>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            Теперь вы можете войти с новым паролем.
          </p>
          <Link
            href="/kunde/anmelden"
            className="btn-coral btn-coral-sm inline-flex items-center gap-2"
          >
            Войти <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Безопасность" titel="Новый пароль">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        {state?.fehler && (
          <div
            className="flex items-center gap-2 p-3 text-sm"
            style={{
              background: "rgba(232,112,58,0.08)",
              border:     "1px solid rgba(232,112,58,0.35)",
              color:      "var(--color-coral-deep, #A53E26)",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" /> {state.fehler}
          </div>
        )}

        {!token && (
          <div
            className="flex items-center gap-2 p-3 text-sm"
            style={{
              background: "rgba(201,168,76,0.10)",
              border:     "1px solid rgba(201,168,76,0.40)",
              color:      "#8B6F47",
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            Токен отсутствует в ссылке. Запросите новое письмо для сброса.
          </div>
        )}

        <Input
          label="Новый пароль"
          name="neues_passwort"
          type="password"
          required
          autoComplete="new-password"
          hint="Минимум 8 символов"
        />
        <Input
          label="Повторите"
          name="wdh"
          type="password"
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          loading={isPending}
          disabled={!token}
          className="w-full justify-center"
          size="lg"
        >
          Установить пароль
        </Button>
      </form>
    </AuthShell>
  );
}
