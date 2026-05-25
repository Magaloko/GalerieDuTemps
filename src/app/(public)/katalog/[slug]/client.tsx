"use client";

import { useState } from "react";
import type { Produktbild } from "@/types/produkt";

interface ProduktDetailClientProps {
  bilder:      Produktbild[];
  produktName: string;
}

export function ProduktDetailClient({ bilder, produktName }: ProduktDetailClientProps) {
  const hauptbild    = bilder.find(b => b.ist_hauptbild) ?? bilder[0];
  const [aktiv, setAktiv] = useState<Produktbild | null>(hauptbild ?? null);

  if (bilder.length === 0) {
    return (
      <div
        className="aspect-square bg-vintage-parchment border border-vintage-sand flex items-center justify-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="text-center text-vintage-dust">
          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-sans">Kein Bild vorhanden</p>
        </div>
      </div>
    );
  }

  const angezeigt = aktiv ?? bilder[0];

  return (
    <div className="space-y-3">
      {/* Hauptbild */}
      <div
        className="aspect-square overflow-hidden bg-vintage-parchment border border-vintage-sand"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={angezeigt.url}
          alt={angezeigt.alt_text ?? produktName}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails */}
      {bilder.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {bilder.map(b => (
            <button
              key={b.id}
              onClick={() => setAktiv(b)}
              className={`
                flex-shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors
                ${angezeigt.id === b.id
                  ? "border-vintage-gold"
                  : "border-vintage-sand hover:border-vintage-brown"
                }
              `}
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={b.alt_text ?? `Bild ${b.sortierung + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
