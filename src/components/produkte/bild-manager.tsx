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

  const handleUpload = useCallback(
    (neu: { id: string; url: string; ist_hauptbild: boolean }) => {
      setBilder(prev => [
        ...prev,
        {
          id:            neu.id,
          produkt_id:    produktId,
          url:           neu.url,
          ist_hauptbild: neu.ist_hauptbild,
          alt_text:      null,
          sortierung:    prev.length,
          breite:        null,
          hoehe:         null,
          dateigroesse:  null,
          erstellt_am:   new Date().toISOString(),
        },
      ]);
    },
    []
  );

  return (
    <div className="space-y-6">
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-base text-vintage-espresso">
          Загрузка изображений
        </h2>
        <BildUploadZone produktId={produktId} onUpload={handleUpload} />
      </section>

      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base text-vintage-espresso">Галерея</h2>
          <p className="text-xs text-vintage-dust font-sans">
            Перетащите для сортировки · Звезда = главное изображение
          </p>
        </div>
        <BildGalerie initialBilder={bilder} produktId={produktId} />
      </section>
    </div>
  );
}
