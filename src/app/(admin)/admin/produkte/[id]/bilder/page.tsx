import { getModuleBase } from "@/lib/module-base-server";
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
  return { title: produkt ? `Фото: ${produkt.name}` : "Товар не найден" };
}

export default async function BilderPage({ params }: Props) {
  const base = await getModuleBase();
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
      <div className="flex items-center gap-2 text-xs font-sans text-[var(--color-ink-mute)]">
        <Link href={`${base}/produkte`} className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Товары
        </Link>
        <span>/</span>
        <Link href={`${base}/produkte/${id}`} className="hover:text-[var(--color-ink)] transition-colors truncate max-w-40">
          {produkt.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-ink)]">Фото</span>
      </div>

      <div>
        <p className="text-xs tracking-widest" style={{ color: "var(--color-coral)" }}>✦</p>
        <h1 className="font-serif text-2xl" style={{ color: "var(--color-ink)" }}>Фото и медиа</h1>
        <p className="text-xs font-sans mt-0.5" style={{ color: "var(--color-ink-mute)" }}>
          {bilder.length} {bilder.length === 1 ? "фото" : "фото"} ·{" "}
          <span style={{ color: "var(--color-ink-soft)" }}>{produkt.name}</span>
        </p>
      </div>

      <UploadVolumeBanner />

      <BildManager produktId={id} initialBilder={bilder} />

      <section
        className="p-6 space-y-4"
        style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-app)" }}
      >
        <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <h2 className="font-serif text-base flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
            <FileText className="w-4 h-4" style={{ color: "var(--color-ink-soft)" }} /> Документы
          </h2>
          <p className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>PDF · максимум 25 МБ</p>
        </div>
        <DateienManager produktId={id} initialItems={dateien} />
      </section>

      <section
        className="p-6 space-y-4"
        style={{ background: "var(--color-app-surface)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-app)" }}
      >
        <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <h2 className="font-serif text-base flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
            <Award className="w-4 h-4" style={{ color: "var(--color-coral)" }} /> Сертификаты
          </h2>
          <p className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>Trust-сигналы на странице товара</p>
        </div>
        <ZertifikateManager produktId={id} initialItems={zertifikate} />
      </section>
    </div>
  );
}
