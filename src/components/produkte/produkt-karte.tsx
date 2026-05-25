"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { formatPreis, rabattProzent } from "@/lib/utils/preis";
import type { ProduktListItem } from "@/types/produkt";

interface ProduktKarteProps {
  produkt: ProduktListItem & { era?: string | null };
  priority?: boolean;
}

export function ProduktKarte({ produkt, priority = false }: ProduktKarteProps) {
  const { toggle, istGemerkt, isLoading } = useWunschliste();
  const gemerkt  = istGemerkt(produkt.id);
  const rabatt   = produkt.originalpreis
    ? rabattProzent(produkt.preis, produkt.originalpreis)
    : 0;

  return (
    <article
      className="group bg-vintage-brown border border-vintage-sand/30 hover:border-vintage-gold/60 transition-all overflow-hidden"
      style={{
        borderRadius: "var(--radius-card)",
        boxShadow:    "var(--shadow-vintage-md)",
      }}
    >
      {/* Bild */}
      <Link href={`/katalog/${produkt.slug}`} className="block relative aspect-square overflow-hidden bg-vintage-ink">
        {produkt.hauptbild_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produkt.hauptbild_url}
            alt={produkt.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-vintage-sand">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {rabatt > 0 && (
            <span
              className="px-2 py-0.5 bg-vintage-burgundy text-white text-xs font-sans"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              −{rabatt}%
            </span>
          )}
          {produkt.featured && (
            <span
              className="px-2 py-0.5 bg-vintage-gold text-vintage-espresso text-xs font-sans"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              Топ
            </span>
          )}
        </div>

        {/* Wunschliste Button */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(produkt.id); }}
          disabled={isLoading}
          className="
            absolute top-2 right-2
            p-2 bg-vintage-espresso/70 backdrop-blur-sm
            hover:bg-vintage-espresso transition-colors
            disabled:opacity-50
          "
          style={{ borderRadius: "var(--radius-card)" }}
          aria-label={gemerkt ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              gemerkt
                ? "fill-vintage-burgundy text-vintage-burgundy"
                : "text-vintage-dust hover:text-vintage-burgundy"
            }`}
          />
        </button>
      </Link>

      {/* Info */}
      <div className="p-5">
        {(produkt.kategorie_name || (produkt as { era?: string | null }).era) && (
          <p className="text-vintage-gold/70 text-[10px] font-sans tracking-[0.2em] uppercase mb-2 truncate">
            {[(produkt as { era?: string | null }).era, produkt.kategorie_name]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <Link href={`/katalog/${produkt.slug}`}>
          <h3 className="font-serif italic text-base text-vintage-cream group-hover:text-vintage-gold transition-colors line-clamp-2 leading-snug">
            {produkt.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between mt-4">
          <div>
            {produkt.b2c_mode === "teaser" ? (
              <Link href="/kunde/registrieren?tab=business" className="font-sans text-xs text-vintage-gold hover:text-vintage-amber transition-colors">
                Зарегистрироваться как студия →
              </Link>
            ) : (
              <>
                <p className="font-serif text-lg text-vintage-gold">
                  {formatPreis(produkt.preis)}
                </p>
                {produkt.originalpreis && (
                  <p className="text-vintage-dust text-xs line-through">
                    {formatPreis(produkt.originalpreis)}
                  </p>
                )}
              </>
            )}
          </div>
          {produkt.verkauft ? (
            <span className="text-xs text-vintage-dust font-sans">Продано</span>
          ) : produkt.lagerbestand === 0 ? (
            <span className="text-xs text-vintage-copper font-sans">Нет в наличии</span>
          ) : produkt.b2c_mode === "teaser" ? (
            <span className="text-xs text-vintage-gold font-sans">Pro-линейка</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
