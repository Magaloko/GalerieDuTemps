import { notFound } from "next/navigation";
import { alleKategorien } from "@/lib/db/kategorien";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { ProduktGrid } from "@/components/produkte/produkt-grid";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

interface Props { params: Promise<{ kategorie: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kategorie } = await params;
  const alle = await alleKategorien();
  const kat = alle.find(k => k.slug === kategorie);
  return kat
    ? { title: `${kat.name} – Galerie du Temps`, description: kat.beschreibung ?? undefined }
    : { title: "Kategorie nicht gefunden" };
}

export default async function KategoriePage({ params }: Props) {
  const { kategorie } = await params;
  const alle = await alleKategorien();
  const kat  = alle.find(k => k.slug === kategorie);
  if (!kat) notFound();

  const daten = await katalogProdukte({ kategorie, limit: 48 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/katalog" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Katalog
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">{kat.name}</span>
      </nav>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest mb-1">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">{kat.name}</h1>
        {kat.beschreibung && (
          <p className="text-vintage-dust font-sans mt-2 max-w-xl">{kat.beschreibung}</p>
        )}
        <p className="text-vintage-dust text-xs font-sans mt-1">
          {daten.gesamt} {daten.gesamt === 1 ? "Stück" : "Stücke"}
        </p>
      </div>

      {/* Andere Kategorien */}
      <div className="flex flex-wrap gap-2">
        {alle.filter(k => k.id !== kat.id && (k.anzahl ?? 0) > 0).map(k => (
          <Link
            key={k.id}
            href={`/kategorien/${k.slug}`}
            className="px-4 py-2 border border-vintage-sand text-vintage-dust text-xs font-sans hover:bg-vintage-parchment hover:text-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {k.name}
          </Link>
        ))}
      </div>

      <ProduktGrid
        produkte={daten.items}
        leerText={`Keine Produkte in ${kat.name}`}
        leerUntertext="Schau in anderen Kategorien vorbei"
      />
    </div>
  );
}
