import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { getStripeConfig } from "@/lib/affiliate/stripe";
import { EinstellungenFormular } from "./einstellungen-formular";
import { Settings } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Globale Einstellungen" };
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
          <h1 className="font-serif text-2xl text-vintage-espresso">Globale Einstellungen</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Firma, SEPA, Stripe, Cookies — wirken sich auf das gesamte System aus
          </p>
        </div>
      </div>

      <EinstellungenFormular
        settings={settings}
        stripeSdkInstalled={sdkInstalled}
        stripeEnvSet={stripeCfg.ready}
      />
    </div>
  );
}
