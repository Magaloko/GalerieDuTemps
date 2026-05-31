import { notFound } from "next/navigation";
import { alleKategorien } from "@/lib/db/kategorien";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { maskBestandListe } from "@/lib/utils/showcase-mask";
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
    ? {
        title:       kat.name,
        description: kat.beschreibung ?? undefined,
        alternates:  { canonical: `/kategorien/${kat.slug}` },
      }
    : { title: "Категория не найдена", robots: { index: false, follow: true } };
}

export default async function KategoriePage({ params }: Props) {
  const { kategorie } = await params;
  const alle = await alleKategorien();
  const kat  = alle.find(k => k.slug === kategorie);
  if (!kat) notFound();

  const [daten, kaufenAktiv] = await Promise.all([
    katalogProdukte({ kategorie, limit: 48 }),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);
  const items = maskBestandListe(daten.items, kaufenAktiv);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 bg-bone text-ink">
      <nav className="flex items-center gap-2 text-xs font-sans text-ink-mute">
        <Link href="/katalog" className="hover:text-ink-soft flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Каталог
        </Link>
        <span>/</span>
        <span className="text-ink">{kat.name}</span>
      </nav>

      <div>
        <p className="text-coral text-xs tracking-widest mb-1">✦</p>
        <h1 className="font-serif text-3xl text-ink">{kat.name}</h1>
        {kat.beschreibung && (
          <p className="text-ink-mute font-sans mt-2 max-w-xl">{kat.beschreibung}</p>
        )}
        <p className="text-ink-mute text-xs font-sans mt-1">
          Всего: {daten.gesamt}
        </p>
      </div>

      {/* Andere Kategorien */}
      <div className="flex flex-wrap gap-2">
        {alle.filter(k => k.id !== kat.id && (k.anzahl ?? 0) > 0).map(k => (
          <Link
            key={k.id}
            href={`/kategorien/${k.slug}`}
            className="px-4 py-2 border border-line text-ink-mute text-xs font-sans hover:bg-paper-warm hover:text-ink-soft transition-colors rounded-[var(--radius-vintage)]"
          >
            {k.name}
          </Link>
        ))}
      </div>

      <ProduktGrid
        produkte={items}
        leerText={`Нет товаров в категории «${kat.name}»`}
        leerUntertext="Загляните в другие категории"
      />
    </div>
  );
}
