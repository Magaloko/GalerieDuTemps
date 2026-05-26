import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { ManuellBestellungClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Neue Bestellung" };

export default function NeueBestellungPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/bestellungen" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Bestellungen
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Neu (manuell)</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
          <FileText className="w-5 h-5 text-vintage-gold" /> Manuell Bestellung anlegen
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          Für Telefon-/Vor-Ort-Käufe oder wenn der Kunde nicht über den Webshop bestellt hat.
          Lagerbestand wird sofort reserviert, NDS 12 % wird automatisch berechnet.
        </p>
      </div>

      <ManuellBestellungClient />
    </div>
  );
}
