import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktFormular } from "@/components/produkte/produkt-formular";
import { produktErstellenAction } from "../actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Neues Produkt" };

export default async function NeuesProduktPage() {
  const kategorien = await alleKategorien();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/produkte" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Produkte
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Neues Produkt</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Neues Produkt</h1>
      </div>

      <ProduktFormular
        kategorien={kategorien}
        action={produktErstellenAction}
      />
    </div>
  );
}
