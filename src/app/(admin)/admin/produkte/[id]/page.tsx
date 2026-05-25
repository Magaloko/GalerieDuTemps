import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktFormular } from "@/components/produkte/produkt-formular";
import { produktAktualisierenAction, produktLoeschenAction } from "../actions";
import Link from "next/link";
import { ChevronLeft, Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }  = await params;
  const produkt = await produktById(id);
  return { title: produkt ? `Bearbeiten: ${produkt.name}` : "Produkt nicht gefunden" };
}

export default async function ProduktBearbeitenPage({ params }: Props) {
  const { id } = await params;
  const [produkt, kategorien] = await Promise.all([
    produktById(id),
    alleKategorien(),
  ]);

  if (!produkt) notFound();

  // Server Actions mit gebundener ID
  const updateAction  = produktAktualisierenAction.bind(null, id);
  const deleteAction  = produktLoeschenAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
          <Link href="/admin/produkte" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Produkte
          </Link>
          <span>/</span>
          <span className="text-vintage-ink truncate max-w-48">{produkt.name}</span>
        </div>
        <Link
          href={`/admin/produkte/${id}/bilder`}
          className="
            flex items-center gap-2 px-4 py-2
            border border-vintage-sand text-vintage-brown
            text-xs font-sans uppercase tracking-widest
            hover:bg-vintage-parchment transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Bilder
        </Link>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">{produkt.name}</h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          ID: {produkt.id} · Slug: {produkt.slug}
        </p>
      </div>

      <ProduktFormular
        produkt={produkt}
        kategorien={kategorien}
        action={updateAction}
        loeschenAction={deleteAction}
      />
    </div>
  );
}
