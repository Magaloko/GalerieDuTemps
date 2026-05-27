import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { subscribeConfirm } from "@/lib/db/newsletter";
import { sendEmail } from "@/lib/email";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Подписка подтверждена" };
export const dynamic = "force-dynamic";

export default async function BestaetigtPage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  const token = sp.token;
  const sub = token ? await subscribeConfirm(token).catch(() => null) : null;

  if (sub) {
    sendEmail({
      to:      [{ email: sub.email, name: sub.vorname ?? "" }],
      subject: "Добро пожаловать в Galerie du Temps — ваш промокод",
      htmlContent: welcomeMail(sub.vorname ?? "", "WELCOME10"),
      tags:    ["newsletter-welcome"],
    }).catch(err => console.error("[Welcome] Brevo:", err));
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className={`inline-flex p-4 border mb-6 ${sub ? "bg-vintage-sage/10 border-vintage-sage/30" : "bg-vintage-burgundy/10 border-vintage-burgundy/30"}`} style={{ borderRadius: "50%" }}>
            {sub
              ? <CheckCircle2 className="w-10 h-10 text-vintage-sage" />
              : <AlertCircle className="w-10 h-10 text-vintage-burgundy" />
            }
          </div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso mb-4">
            {sub ? "Подписка подтверждена!" : "Ссылка недействительна"}
          </h1>
          {sub ? (
            <>
              <p className="text-vintage-dust font-sans text-sm mb-3">
                Спасибо! Сейчас вы получите приветственное письмо с промокодом.
              </p>
              <div className="bg-vintage-gold/10 border border-vintage-gold/30 p-4 my-6" style={{ borderRadius: "var(--radius-card)" }}>
                <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-1 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-vintage-gold" /> Ваш промокод
                </p>
                <p className="font-mono text-xl tracking-widest text-vintage-gold">WELCOME10</p>
                <p className="text-xs text-vintage-dust font-sans mt-1">−10% на первый заказ</p>
              </div>
            </>
          ) : (
            <p className="text-vintage-dust font-sans text-sm mb-6">
              Ссылка подтверждения недействительна или истекла. Пожалуйста, подпишитесь снова.
            </p>
          )}
          <Link href={sub ? "/katalog" : "/newsletter/anmelden"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}>
            {sub ? "В каталог" : "Подписаться снова"}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function welcomeMail(vorname: string, code: string): string {
  const anrede = vorname ? `Здравствуйте, ${vorname}!` : "Здравствуйте!";
  return `
    <!DOCTYPE html><html lang="ru"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 26px; text-align: center; margin: 0 0 24px; font-weight: normal;">
          Добро пожаловать в Galerie du Temps
        </h1>
        <p style="color: #4A2C1A;">${anrede}</p>
        <p style="color: #4A2C1A; line-height: 1.7;">
          Спасибо за подписку! В качестве небольшого приветственного подарка вы получаете
          скидку 10% на первый заказ по следующему промокоду:
        </p>
        <div style="background: #E8DFD0; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 24px 0; text-align: center;">
          <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Ваш промокод</p>
          <p style="margin: 8px 0 0; color: #4A2C1A; font-family: monospace; font-size: 22px; letter-spacing: 4px;">${code}</p>
        </div>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXTAUTH_URL ?? ""}/katalog" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            Использовать сейчас
          </a>
        </p>
      </div>
    </body></html>
  `;
}
