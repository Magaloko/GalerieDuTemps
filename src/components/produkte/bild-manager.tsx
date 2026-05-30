"use client";

import { useState, useCallback } from "react";
import { BildUploadZone } from "./bild-upload-zone";
import { BildGalerie } from "./bild-galerie";
import type { Produktbild } from "@/types/produkt";

interface Props {
  produktId:     string;
  initialBilder: Produktbild[];
}

export function BildManager({ produktId, initialBilder }: Props) {
  const [bilder, setBilder] = useState<Produktbild[]>(initialBilder);

  // Server liefert vollständiges Produktbild zurück (inkl. url_thumb/medium/large)
  const handleUpload = useCallback((neu: Produktbild) => {
    setBilder(prev => [
      // Wenn neu das Hauptbild ist, alle anderen zurücksetzen
      ...prev.map(b => neu.ist_hauptbild ? { ...b, ist_hauptbild: false } : b),
      neu,
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <section
        className="bg-[var(--color-app-surface)] border border-[var(--color-line)] p-6 space-y-3"
        style={{ borderRadius: "var(--radius-app)" }}
      >
        <h2 className="font-serif text-base text-[var(--color-ink)]">
          Загрузка изображений
        </h2>
        <BildUploadZone produktId={produktId} onUpload={handleUpload} />
      </section>

      <section
        className="bg-[var(--color-app-surface)] border border-[var(--color-line)] p-6 space-y-4"
        style={{ borderRadius: "var(--radius-app)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-serif text-base text-[var(--color-ink)]">
            Галерея <span className="text-[var(--color-ink-mute)] text-sm">· {bilder.length}</span>
          </h2>
          <p className="text-xs text-[var(--color-ink-mute)] font-sans">
            Перетащите для сортировки · Звезда = главное · Клик по описанию для редактирования
          </p>
        </div>
        <BildGalerie initialBilder={bilder} produktId={produktId} />
      </section>
    </div>
  );
}
