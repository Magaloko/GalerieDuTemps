"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { passwortAendernAction } from "./actions";

export default function PasswortAendernPage() {
  const [state, formAction, isPending] = useActionState(passwortAendernAction, null);

  return (
    <div className="max-w-md space-y-6">
      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Безопасность
        </p>
        <h1
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "clamp(1.875rem, 3.5vw, 2.25rem)",
            color:      "var(--color-ink)",
            lineHeight: 1.05,
          }}
        >
          <Lock className="w-6 h-6" style={{ color: "var(--color-coral)" }} />
          Сменить пароль
        </h1>
      </header>

      <form
        action={formAction}
        className="p-6 space-y-5"
        style={{ background: "#fff", border: "1px solid var(--color-line)" }}
      >
        {state?.ok && (
          <div
            className="flex items-center gap-3 p-4 text-sm"
            style={{
              background: "rgba(127,140,90,0.10)",
              border:     "1px solid rgba(127,140,90,0.35)",
              color:      "#52663F",
            }}
          >
            <CheckCircle2 className="w-4 h-4" /> Пароль успешно изменён.
          </div>
        )}
        {state?.fehler && (
          <div
            className="flex items-center gap-3 p-4 text-sm"
            style={{
              background: "rgba(232,112,58,0.08)",
              border:     "1px solid rgba(232,112,58,0.35)",
              color:      "var(--color-coral-deep, #A53E26)",
            }}
          >
            <AlertCircle className="w-4 h-4" /> {state.fehler}
          </div>
        )}

        <Input label="Текущий пароль"   name="altes_passwort"      type="password" required autoComplete="current-password" />
        <Input label="Новый пароль"     name="neues_passwort"      type="password" required autoComplete="new-password" hint="Минимум 8 символов" />
        <Input label="Повторите"         name="neues_passwort_wdh" type="password" required autoComplete="new-password" />

        <Button type="submit" loading={isPending} className="w-full justify-center">
          Обновить пароль
        </Button>
      </form>
    </div>
  );
}
