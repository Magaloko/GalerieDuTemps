import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Регистрация завершена" };

export default function ErfolgPage() {
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
            Регистрация завершена!
          </h1>
          <p className="text-vintage-dust font-sans mb-8 leading-relaxed">
            Ваш аккаунт создан. Мы проверим заявку и активируем доступ, как правило,
            в течение 1–2 рабочих дней. Вы получите письмо на e-mail, как только всё
            будет готово.
          </p>
          <Link
            href="/affiliate/anmelden"
            className="inline-flex items-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            Перейти ко входу
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
