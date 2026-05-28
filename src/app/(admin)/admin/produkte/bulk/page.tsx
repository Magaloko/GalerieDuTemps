import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import { BulkUploader } from "./bulk-uploader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Фото пачкой → черновики" };

export default async function BulkUploadPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <nav className="text-[11px] uppercase font-medium flex items-center gap-2" style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>
        <Link href="/admin/produkte/entwuerfe" className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Черновики
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Загрузка пачкой</span>
      </nav>

      <header>
        <p className="text-[11px] uppercase font-medium mb-1" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
          ✦ Массовое добавление
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-ink)" }}>
          Фото пачкой → черновики
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-1">
          Выберите много фото — для каждого создаётся черновик. Затем в «Черновиках»
          заполните ИИ/вручную и опубликуйте.
        </p>
      </header>

      <UploadVolumeBanner />
      <BulkUploader />
    </div>
  );
}
