import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { emailConfirmationEinloesen } from "@/lib/db/customer-auth";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "E-mail подтверждён" };
export const dynamic = "force-dynamic";

export default async function BestaetigtPage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const sp         = await searchParams;
  const token      = sp.token;
  const customerId = token ? await emailConfirmationEinloesen(token).catch(() => null) : null;
  const ok         = !!customerId;

  return (
    <AuthShell
      eyebrow={ok ? "Подтверждение" : "Ошибка"}
      titel={ok ? "E-mail подтверждён!" : "Ссылка недействительна"}
      footer={
        <Link
          href="/"
          className="text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          ← На главную
        </Link>
      }
    >
      <div className="text-center space-y-5">
        <div
          className="inline-flex items-center justify-center"
          style={{
            width:        64,
            height:       64,
            background:   ok ? "rgba(127,140,90,0.12)" : "rgba(232,112,58,0.08)",
            border:       `1px solid ${ok ? "rgba(127,140,90,0.40)" : "rgba(232,112,58,0.40)"}`,
            borderRadius: "50%",
          }}
        >
          {ok ? (
            <CheckCircle2 className="w-8 h-8" style={{ color: "#52663F" }} />
          ) : (
            <AlertCircle className="w-8 h-8" style={{ color: "var(--color-coral-deep, #A53E26)" }} />
          )}
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
          {ok
            ? "Ваш аккаунт активирован. Теперь вы можете войти."
            : "Ссылка подтверждения недействительна или истекла. Пожалуйста, зарегистрируйтесь снова или запросите новое письмо."
          }
        </p>

        <Link
          href={ok ? "/kunde/anmelden" : "/kunde/registrieren"}
          className="btn-coral btn-coral-sm inline-flex items-center gap-2 mt-2"
        >
          {ok ? "Войти" : "Зарегистрироваться"} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </AuthShell>
  );
}
