import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { alleKategorienAdmin, kategorieById } from "@/lib/db/kategorien";
import { KategorieFormular } from "@/components/kategorien/kategorie-formular";
import { kategorieAktualisierenAction, kategorieLoeschenAction } from "../actions";
import type { Metadata } from "next";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const k = await kategorieById(Number(id));
  return { title: k ? `Изменить: ${k.name}` : "Категория не найдена" };
}

export default async function KategorieEditPage({ params }: Props) {
  const { id } = await params;
  const katId = Number(id);
  const [kat, alle] = await Promise.all([
    kategorieById(katId),
    alleKategorienAdmin(),
  ]);
  if (!kat) notFound();

  const updateAction = kategorieAktualisierenAction.bind(null, katId);
  const deleteAction = kategorieLoeschenAction.bind(null, katId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/kategorien" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Категории
        </Link>
        <span>/</span>
        <span className="text-vintage-ink truncate max-w-48">{kat.name}</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">{kat.name}</h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          ID: {kat.id} · Slug: {kat.slug}
          {kat.anzahl !== undefined && ` · товаров: ${kat.anzahl}`}
        </p>
      </div>

      <KategorieFormular
        kategorie={{ ...kat, anzahl: kat.anzahl ?? 0 }}
        elternKandidaten={alle}
        action={updateAction}
        loeschenAction={deleteAction}
      />
    </div>
  );
}
