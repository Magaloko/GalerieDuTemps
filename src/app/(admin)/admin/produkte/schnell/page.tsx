import { getModuleBase } from "@/lib/module-base-server";
import { alleKategorien } from "@/lib/db/kategorien";
import { SchnellFormular } from "@/components/produkte/schnell-formular";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Быстрое добавление (ИИ)" };

export default async function SchnellHinzufuegenPage() {
  const base = await getModuleBase();
  const kategorien = await alleKategorien();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-[var(--color-ink-mute)]">
        <Link href={`${base}/produkte`} className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Товары
        </Link>
        <span>/</span>
        <span className="text-[var(--color-ink)]">Быстрое добавление</span>
      </div>

      <div>
        <p className="text-xs tracking-widest" style={{ color: "var(--color-coral)" }}>✦</p>
        <h1 className="font-serif text-2xl flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
          <Sparkles className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
          Быстрое добавление с ИИ
        </h1>
        <p className="text-xs font-sans mt-1" style={{ color: "var(--color-ink-mute)" }}>
          Загрузи фото, напиши заметки, ИИ сгенерирует название, описание, теги, SEO и пост для Instagram.
        </p>
      </div>

      <UploadVolumeBanner />

      <SchnellFormular kategorien={kategorien} />
    </div>
  );
}
