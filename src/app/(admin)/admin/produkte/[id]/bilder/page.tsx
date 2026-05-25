import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { BildManager } from "@/components/produkte/bild-manager";
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

      <BildManager produktId={id} initialBilder={bilder} />
    </div>
  );
}
