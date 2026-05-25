import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RegistrierungsFormular } from "./registrierungs-formular";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Konto erstellen" };

export default async function RegistrierenPage({
  searchParams,
}: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "business" ? "business" : "privat";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 py-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
            <h1 className="font-serif text-3xl text-vintage-espresso">Konto erstellen</h1>
            <p className="text-vintage-dust font-sans text-sm mt-2">
              Erstelle ein Konto, um Bestellungen zu verfolgen und schneller einzukaufen.
            </p>
          </div>

          <RegistrierungsFormular initialTab={tab as "privat" | "business"} />

          <p className="text-center text-vintage-dust text-xs font-sans mt-6">
            Schon ein Konto?{" "}
            <Link href="/kunde/anmelden" className="text-vintage-brown hover:text-vintage-espresso underline">
              Hier anmelden
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
