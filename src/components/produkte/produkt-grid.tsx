import { ProduktKarte } from "./produkt-karte";
import { Package } from "lucide-react";
import type { ProduktListItem } from "@/types/produkt";

interface ProduktGridProps {
  produkte:       (ProduktListItem & { era?: string | null })[];
  leerText?:      string;
  leerUntertext?: string;
  prioCount?:     number;    // Erste N Bilder eager laden
}

export function ProduktGrid({
  produkte,
  leerText      = "Ничего не найдено",
  leerUntertext = "Загляните позже.",
  prioCount     = 4,
}: ProduktGridProps) {
  if (produkte.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="w-14 h-14 mb-4" style={{ color: "var(--color-ink-mute)" }} />
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          {leerText}
        </p>
        <p
          className="mt-2 text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-mute)",
          }}
        >
          {leerUntertext}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-x-3.5 sm:gap-x-6 md:gap-x-8 gap-y-8 md:gap-y-10">
      {produkte.map((p, i) => (
        <ProduktKarte key={p.id} produkt={p} priority={i < prioCount} />
      ))}
    </div>
  );
}
