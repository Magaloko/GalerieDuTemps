import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import Link from "next/link";
import { emailConfirmationEinloesen } from "@/lib/db/customer-auth";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "E-Mail bestätigt" };
export const dynamic = "force-dynamic";

export default async function BestaetigtPage({
  searchParams,
}: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  const token = sp.token;
  const customerId = token ? await emailConfirmationEinloesen(token).catch(() => null) : null;
  const ok = !!customerId;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className={`inline-flex p-4 border mb-6 ${ok ? "bg-vintage-sage/10 border-vintage-sage/30" : "bg-vintage-burgundy/10 border-vintage-burgundy/30"}`} style={{ borderRadius: "50%" }}>
            {ok
              ? <CheckCircle2 className="w-10 h-10 text-vintage-sage" />
              : <AlertCircle className="w-10 h-10 text-vintage-burgundy" />
            }
          </div>
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso mb-4">
            {ok ? "E-Mail bestätigt!" : "Link ungültig"}
          </h1>
          <p className="text-vintage-dust font-sans text-sm leading-relaxed mb-8">
            {ok
              ? "Dein Konto ist jetzt aktiv. Du kannst dich anmelden."
              : "Der Bestätigungs-Link ist ungültig oder abgelaufen. Bitte registriere dich erneut."
            }
          </p>
          <Link
            href={ok ? "/kunde/anmelden" : "/kunde/registrieren"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {ok ? "Jetzt anmelden" : "Erneut registrieren"}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
