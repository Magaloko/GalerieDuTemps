import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { KategorieFormular } from "@/components/kategorien/kategorie-formular";
import { kategorieErstellenAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Новая категория" };

export default async function NeueKategoriePage() {
  const base = await getModuleBase();
  const elternKandidaten = await alleKategorienAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href={`${base}/kategorien`} className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Категории
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Новая</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Новая категория</h1>
      </div>

      <KategorieFormular
        elternKandidaten={elternKandidaten}
        action={kategorieErstellenAction}
      />
    </div>
  );
}
