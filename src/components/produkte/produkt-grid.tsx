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
  leerText      = "Keine Produkte gefunden",
  leerUntertext = "Schau später wieder vorbei.",
  prioCount     = 4,
}: ProduktGridProps) {
  if (produkte.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Package className="w-14 h-14 text-vintage-sand mb-4" />
        <p className="font-serif text-xl text-vintage-brown">{leerText}</p>
        <p className="text-vintage-dust text-sm font-sans mt-2">{leerUntertext}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {produkte.map((p, i) => (
        <ProduktKarte key={p.id} produkt={p} priority={i < prioCount} />
      ))}
    </div>
  );
}
