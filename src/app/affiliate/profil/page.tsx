import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { affiliateById } from "@/lib/db/affiliates";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { getStripeConfig } from "@/lib/affiliate/stripe";
import { ProfilFormular } from "./profil-formular";
import { StripeConnectSektion } from "./stripe-connect-sektion";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Профиль" };
export const dynamic = "force-dynamic";

export default async function ProfilPage({
  searchParams,
}: { searchParams: Promise<{ stripe?: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") redirect("/affiliate/anmelden");

  const affiliate = await affiliateById(session.user.id);
  if (!affiliate) redirect("/affiliate/anmelden");

  const [sys, stripeStatus, sp] = await Promise.all([
    systemEinstellungenLaden(),
    Promise.resolve(getStripeConfig()),
    searchParams,
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Мой профиль</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          Личные данные, способ выплаты, ИИН/БИН и налоговый статус
        </p>
      </div>

      {/* Stripe-Connect Sektion (nur wenn aktiviert) */}
      {sys.stripe_connect_enabled && (
        <StripeConnectSektion
          affiliate={affiliate}
          stripeReady={stripeStatus.ready}
          stripeMode={stripeStatus.mode}
          urlStatus={sp.stripe}
        />
      )}

      <ProfilFormular affiliate={affiliate} />
    </div>
  );
}
