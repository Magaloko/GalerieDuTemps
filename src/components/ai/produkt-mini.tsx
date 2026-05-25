import Link from "next/link";
import { formatPreis } from "@/lib/utils/preis";
import type { ProduktListItem } from "@/types/produkt";

/** Kompakte Produkt-Karte für Chat-Antworten */
export function ProduktMini({ produkt }: { produkt: ProduktListItem }) {
  return (
    <Link
      href={`/katalog/${produkt.slug}`}
      className="
        flex gap-3 p-2.5
        bg-vintage-white border border-vintage-sand
        hover:border-vintage-brown transition-colors
        group
      "
      style={{ borderRadius: "var(--radius-vintage)" }}
    >
      <div className="w-14 h-14 flex-shrink-0 bg-vintage-parchment overflow-hidden" style={{ borderRadius: "var(--radius-vintage)" }}>
        {produkt.hauptbild_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produkt.hauptbild_url}
            alt={produkt.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-vintage-sand text-xs">
            ✦
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm text-vintage-espresso truncate group-hover:text-vintage-brown transition-colors">
          {produkt.name}
        </p>
        {produkt.kategorie_name && (
          <p className="text-xs text-vintage-dust font-sans truncate">
            {produkt.kategorie_name}
          </p>
        )}
        <p className="font-serif text-vintage-espresso text-sm mt-0.5">
          {formatPreis(produkt.preis)}
        </p>
      </div>
    </Link>
  );
}
