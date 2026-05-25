import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Mail, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Registrierung erfolgreich" };

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
            {istB2B ? "B2B-Antrag eingegangen!" : "Konto erstellt!"}
          </h1>
          <div className="flex items-center justify-center gap-2 text-vintage-brown mb-6">
            <Mail className="w-4 h-4" />
            <p className="text-sm font-sans">Bitte bestätige deine E-Mail-Adresse</p>
          </div>
          <p className="text-vintage-dust font-sans text-sm leading-relaxed mb-2">
            Wir haben dir einen Bestätigungs-Link gesendet. Klicke auf den Link, um dein
            Konto zu aktivieren und dich danach anzumelden.
          </p>
          {istB2B && (
            <p className="text-vintage-dust font-sans text-sm leading-relaxed">
              Nach Bestätigung deiner E-Mail prüfen wir deinen B2B-Antrag innerhalb von
              1-2 Werktagen.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
