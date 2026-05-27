import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { dateienFuerProdukt, zertifikateFuerProdukt } from "@/lib/db/produkt-medien";
import { BildManager } from "@/components/produkte/bild-manager";
import { DateienManager } from "@/components/produkte/dateien-manager";
import { ZertifikateManager } from "@/components/produkte/zertifikate-manager";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import Link from "next/link";
import { ChevronLeft, FileText, Award } from "lucide-react";
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
  const [produkt, bilder, dateien, zertifikate] = await Promise.all([
    produktById(id),
    bilderFuerProdukt(id),
    dateienFuerProdukt(id),
    zertifikateFuerProdukt(id),
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

      <UploadVolumeBanner />

      <BildManager produktId={id} initialBilder={bilder} />

      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-base text-vintage-espresso flex items-center gap-2">
            <FileText className="w-4 h-4 text-vintage-brown" /> Документы / Загрузки
          </h2>
          <p className="text-xs font-sans text-vintage-dust">PDF · максимум 25 МБ</p>
        </div>
        <DateienManager produktId={id} initialItems={dateien} />
      </section>

      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-base text-vintage-espresso flex items-center gap-2">
            <Award className="w-4 h-4 text-vintage-gold" /> Сертификаты
          </h2>
          <p className="text-xs font-sans text-vintage-dust">Trust-сигналы на странице товара</p>
        </div>
        <ZertifikateManager produktId={id} initialItems={zertifikate} />
      </section>
    </div>
  );
}
