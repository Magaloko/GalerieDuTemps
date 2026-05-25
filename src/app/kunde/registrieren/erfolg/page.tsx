import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Mail, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Регистрация прошла успешно" };

export default async function ErfolgPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const istB2B = sp.tab === "business";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className="inline-flex p-4 bg-vintage-sage/10 border border-vintage-sage/30 mb-6" style={{ borderRadius: "50%" }}>
            <CheckCircle2 className="w-10 h-10 text-vintage-sage" />
          </div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso mb-4">
            {istB2B ? "B2B-заявка получена!" : "Аккаунт создан!"}
          </h1>
          <div className="flex items-center justify-center gap-2 text-vintage-brown mb-6">
            <Mail className="w-4 h-4" />
            <p className="text-sm font-sans">Пожалуйста, подтвердите ваш e-mail</p>
          </div>
          <p className="text-vintage-dust font-sans text-sm leading-relaxed mb-2">
            Мы отправили вам письмо со ссылкой подтверждения. Нажмите на ссылку, чтобы
            активировать аккаунт и затем войти.
          </p>
          {istB2B && (
            <p className="text-vintage-dust font-sans text-sm leading-relaxed">
              После подтверждения e-mail мы рассмотрим вашу B2B-заявку в течение 1–2 рабочих дней.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
