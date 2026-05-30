import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { getStripeConfig } from "@/lib/affiliate/stripe";
import { EinstellungenFormular } from "./einstellungen-formular";
import { EmailHealthBanner } from "@/components/produkte/email-health-banner";
import { Settings, MessageSquareText, Send, Bell, Palette, Activity, ToggleLeft, ArrowRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Глобальные настройки" };
export const dynamic = "force-dynamic";

async function stripeSdkVerfuegbar(): Promise<boolean> {
  try {
    // Bypass TypeScript resolution (Modul ist optional, wird via npm i stripe nachinstalliert)
    const moduleName = "stripe";
    await import(/* @vite-ignore */ /* webpackIgnore: true */ moduleName);
    return true;
  } catch {
    return false;
  }
}

export default async function GlobaleEinstellungenPage() {
  const base = await getModuleBase();
  const [settings, sdkInstalled] = await Promise.all([
    systemEinstellungenLaden(),
    stripeSdkVerfuegbar(),
  ]);
  const stripeCfg = getStripeConfig();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Глобальные настройки</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Компания, реквизиты, Stripe, cookies — действуют на всю систему
          </p>
        </div>
      </div>

      {/* Sub-Areale: Design, Marketing, Telegram, Benutzer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SettingsLink
          href={`${base}/einstellungen/design`}
          icon={Palette}
          title="Дизайн сайта"
          desc="Цвета, логотип, фавикон, название бренда"
        />
        <SettingsLink
          href={`${base}/einstellungen/marketing`}
          icon={MessageSquareText}
          title="Маркетинговые тексты"
          desc="Hero, тикер, баннер · реквизиты для оплаты"
        />
        <SettingsLink
          href={`${base}/einstellungen/ki`}
          icon={Sparkles}
          title="ИИ · DeepSeek"
          desc="API-ключ для ассистента и ИИ-заполнения товаров"
        />
        <SettingsLink
          href={`${base}/einstellungen/telegram`}
          icon={Send}
          title="Telegram-бот"
          desc="Бот для входящих сообщений + уведомления"
        />
        <SettingsLink
          href={`${base}/einstellungen/benutzer`}
          icon={Bell}
          title="Администраторы"
          desc="Управление доступом"
        />
        <SettingsLink
          href={`${base}/einstellungen/system`}
          icon={Activity}
          title="Системное состояние"
          desc="БД, Redis, e-mail, uploads · live-диагностика"
        />
        <SettingsLink
          href={`${base}/einstellungen/module`}
          icon={ToggleLeft}
          title="Модули"
          desc="Вкл/выкл B2B, ИИ-ассистент, wishlist · авто-перевод"
        />
      </div>

      <EmailHealthBanner />

      <EinstellungenFormular
        settings={settings}
        stripeSdkInstalled={sdkInstalled}
        stripeEnvSet={stripeCfg.ready}
      />
    </div>
  );
}

function SettingsLink({
  href, icon: Icon, title, desc,
}: {
  href:  string;
  icon:  React.ElementType;
  title: string;
  desc:  string;
}) {
  return (
    <Link
      href={href}
      className="group p-4 transition-all hover:shadow-soft"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
        <ArrowRight
          className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-coral)" }}
        />
      </div>
      <p
        className="mt-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   18,
          color:      "var(--color-ink)",
        }}
      >
        {title}
      </p>
      <p
        className="mt-1 text-[12px]"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
        }}
      >
        {desc}
      </p>
    </Link>
  );
}
