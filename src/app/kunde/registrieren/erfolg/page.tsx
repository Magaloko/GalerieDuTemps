import Link from "next/link";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Регистрация прошла успешно" };

export default async function ErfolgPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const sp     = await searchParams;
  const istB2B = sp.tab === "business";

  return (
    <AuthShell
      eyebrow={istB2B ? "B2B-заявка" : "Регистрация"}
      titel={istB2B ? "Заявка получена!" : "Аккаунт создан!"}
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
            background:   "rgba(127,140,90,0.12)",
            border:       "1px solid rgba(127,140,90,0.40)",
            borderRadius: "50%",
          }}
        >
          <CheckCircle2 className="w-8 h-8" style={{ color: "#52663F" }} />
        </div>

        <div
          className="flex items-center justify-center gap-2"
          style={{ color: "var(--color-coral)" }}
        >
          <Mail className="w-4 h-4" />
          <p
            className="text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em" }}
          >
            Подтвердите e-mail
          </p>
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
          Мы отправили вам письмо со ссылкой подтверждения. Нажмите на ссылку,
          чтобы активировать аккаунт и затем войти.
        </p>

        {istB2B && (
          <p
            className="text-xs px-3 py-2.5"
            style={{
              background: "rgba(201,168,76,0.10)",
              border:     "1px solid rgba(201,168,76,0.30)",
              color:      "#8B6F47",
            }}
          >
            После подтверждения e-mail мы рассмотрим вашу B2B-заявку в течение
            1–2 рабочих дней.
          </p>
        )}

        <Link
          href="/kunde/anmelden"
          className="btn-coral btn-coral-sm inline-flex items-center gap-2 mt-2"
        >
          Перейти ко входу <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </AuthShell>
  );
}
