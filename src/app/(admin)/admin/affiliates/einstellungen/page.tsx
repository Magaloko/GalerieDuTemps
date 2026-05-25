import { Settings } from "lucide-react";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { EinstellungenFormular } from "./einstellungen-formular";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Affiliate-Einstellungen" };
export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  const settings = await affiliateEinstellungenLaden();

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/affiliates" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Affiliates
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Einstellungen</span>
      </nav>

      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-vintage-gold" />
        <h1 className="font-serif text-2xl text-vintage-espresso">Affiliate-Einstellungen</h1>
      </div>

      <EinstellungenFormular settings={settings} />
    </div>
  );
}
