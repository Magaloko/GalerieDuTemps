import { alleKategorien } from "@/lib/db/kategorien";
import { SchnellFormular } from "@/components/produkte/schnell-formular";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Быстрое добавление (ИИ)" };

export default async function SchnellHinzufuegenPage() {
  const kategorien = await alleKategorien();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/produkte" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Товары
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Быстрое добавление</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-vintage-gold" />
          Быстрое добавление с ИИ
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-1">
          Загрузи фото, напиши заметки, ИИ сгенерирует название, описание, теги, SEO и пост для Instagram.
        </p>
      </div>

      <UploadVolumeBanner />

      <SchnellFormular kategorien={kategorien} />
    </div>
  );
}
