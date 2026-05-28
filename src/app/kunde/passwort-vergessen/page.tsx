"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { passwortVergessenAction } from "./actions";

export default function PasswortVergessenPage() {
  const [state, formAction, isPending] = useActionState(passwortVergessenAction, null);

  const footerLink = (
    <Link
      href="/kunde/anmelden"
      className="text-[11px] uppercase font-medium hover:opacity-80 transition-colors"
      style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
    >
      ← Ко входу
    </Link>
  );

  if (state?.ok) {
    return (
      <AuthShell eyebrow="Сброс пароля" titel="Письмо отправлено" footer={footerLink}>
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
              lineHeight: 1.6,
            }}
          >
            Если аккаунт с этим e-mail существует, вы скоро получите ссылку
            для сброса пароля. Проверьте папку «Спам» если письма нет.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Сброс пароля" titel="Забыли пароль?" footer={footerLink}>
      <form action={formAction} className="space-y-5">
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

        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
            lineHeight: 1.6,
          }}
        >
          Введите ваш e-mail. Мы отправим ссылку для установки нового пароля.
        </p>

        <Input label="E-mail" name="email" type="email" required autoFocus />

        <Button type="submit" loading={isPending} className="w-full justify-center" size="lg">
          Отправить ссылку
        </Button>
      </form>
    </AuthShell>
  );
}
