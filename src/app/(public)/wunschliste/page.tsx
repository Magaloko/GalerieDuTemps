"use client";

import { useWunschliste } from "@/hooks/use-wunschliste";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";

export default function WunschlistePage() {
  const { ids, toggle } = useWunschliste();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-1">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">
          Meine Wunschliste
        </h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {ids.length} {ids.length === 1 ? "Stück" : "Stücke"} gemerkt
        </p>
      </div>

      {ids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Heart className="w-14 h-14 text-vintage-sand mb-4" />
          <p className="font-serif text-xl text-vintage-brown mb-2">
            Noch nichts gemerkt
          </p>
          <p className="text-vintage-dust text-sm font-sans mb-6">
            Klicke auf das Herz bei einem Produkt, um es hier zu speichern.
          </p>
          <Link
            href="/katalog"
            className="
              inline-flex items-center gap-2 px-6 py-3
              bg-vintage-espresso text-vintage-cream
              font-sans text-xs tracking-widest uppercase
              hover:bg-vintage-brown transition-colors
            "
            style={{ borderRadius: "var(--radius-button)" }}
          >
            Katalog entdecken <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-xs text-vintage-dust font-sans mb-6">
            Deine Wunschliste wird in diesem Browser gespeichert.
          </p>
          <div className="space-y-3">
            {ids.map(id => (
              <WunschlistenItem key={id} produktId={id} onEntfernen={() => toggle(id)} />
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-vintage-sand flex justify-between items-center">
            <Link
              href="/katalog"
              className="text-sm font-sans text-vintage-brown hover:text-vintage-espresso transition-colors flex items-center gap-1"
            >
              Weiter stöbern <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/kontakt"
              className="
                px-6 py-2.5 bg-vintage-gold text-vintage-espresso
                font-sans text-xs tracking-widest uppercase
                hover:bg-vintage-copper transition-colors
              "
              style={{ borderRadius: "var(--radius-button)" }}
            >
              Anfrage zu allen Stücken
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Einzelner Wunschlisten-Eintrag – lädt Produkt-Daten client-seitig */
function WunschlistenItem({
  produktId,
  onEntfernen,
}: {
  produktId:   string;
  onEntfernen: () => void;
}) {
  // Vereinfacht: Placeholder-Darstellung
  // In Phase 5/6 kann dies über die API aufgelöst werden
  return (
    <div
      className="flex items-center gap-4 p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="w-14 h-14 bg-vintage-parchment border border-vintage-sand flex-shrink-0 flex items-center justify-center" style={{ borderRadius: "var(--radius-vintage)" }}>
        <Heart className="w-5 h-5 text-vintage-sand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-vintage-ink text-sm font-sans truncate">Produkt #{produktId.slice(0, 8)}</p>
        <p className="text-vintage-dust text-xs font-sans">Gespeichert</p>
      </div>
      <button
        onClick={onEntfernen}
        className="p-2 text-vintage-dust hover:text-vintage-burgundy transition-colors"
        style={{ borderRadius: "var(--radius-vintage)" }}
        aria-label="Entfernen"
      >
        <Heart className="w-4 h-4 fill-vintage-burgundy text-vintage-burgundy" />
      </button>
    </div>
  );
}
