import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { BildGalerie } from "@/components/produkte/bild-galerie";
import { BildUploadZone } from "@/components/produkte/bild-upload-zone";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }  = await params;
  const produkt = await produktById(id);
  return { title: produkt ? `Bilder: ${produkt.name}` : "Produkt nicht gefunden" };
}

export default async function BilderPage({ params }: Props) {
  const { id } = await params;
  const [produkt, bilder] = await Promise.all([
    produktById(id),
    bilderFuerProdukt(id),
  ]);

  if (!produkt) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/produkte" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Produkte
        </Link>
        <span>/</span>
        <Link href={`/admin/produkte/${id}`} className="hover:text-vintage-brown transition-colors truncate max-w-40">
          {produkt.name}
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Bilder</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Bilder verwalten</h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          {bilder.length} {bilder.length === 1 ? "Bild" : "Bilder"} ·{" "}
          <span className="text-vintage-brown">{produkt.name}</span>
        </p>
      </div>

      {/* Upload-Zone */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-base text-vintage-espresso">Bilder hochladen</h2>
        <BildUploadZone
          produktId={id}
          onUpload={() => {
            // Galerie aktualisiert sich client-seitig via State
          }}
        />
      </section>

      {/* Galerie */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base text-vintage-espresso">
            Galerie
          </h2>
          <p className="text-xs text-vintage-dust font-sans">
            Ziehen zum Sortieren · Stern = Hauptbild
          </p>
        </div>
        <BildGalerie initialBilder={bilder} produktId={id} />
      </section>
    </div>
  );
}
