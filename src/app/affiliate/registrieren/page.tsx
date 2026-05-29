import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RegistrierungsFormular } from "./registrierungs-formular";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Стать партнёром — регистрация" };

export default async function RegistrierenPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const settings  = await affiliateEinstellungenLaden();
  const sp        = await searchParams;
  const sponsorRef = sp.ref;

  if (!settings.registrierung_offen) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-md text-center">
            <Lock className="w-12 h-12 text-vintage-sand mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-vintage-cream mb-3">
              Регистрация закрыта
            </h1>
            <p className="text-vintage-dust font-sans mb-6">
              Партнёрская программа сейчас не принимает новые заявки.
              Загляните чуть позже.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 border border-vintage-sand/40 text-vintage-cream/80 font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown/40 transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
              На главную <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ Стать партнёром</p>
            <h1 className="font-serif text-3xl text-vintage-cream">Регистрация</h1>
            <p className="text-vintage-dust font-sans mt-2 max-w-md mx-auto">
              Создайте партнёрский аккаунт за 2 минуты. После проверки вы получите доступ.
            </p>
          </div>

          <RegistrierungsFormular sponsorCodeVorbelegt={sponsorRef} />

          <p className="text-center text-vintage-dust text-xs font-sans mt-6">
            Уже зарегистрированы?{" "}
            <Link href="/affiliate/anmelden" className="text-vintage-cream/80 hover:text-vintage-cream underline">
              Войти
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
