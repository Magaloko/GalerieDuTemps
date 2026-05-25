import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { KategorieFormular } from "@/components/kategorien/kategorie-formular";
import { kategorieErstellenAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Neue Kategorie" };

export default async function NeueKategoriePage() {
  const elternKandidaten = await alleKategorienAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/kategorien" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Kategorien
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Neu</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Neue Kategorie</h1>
      </div>

      <KategorieFormular
        elternKandidaten={elternKandidaten}
        action={kategorieErstellenAction}
      />
    </div>
  );
}
