"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { formatPreis, rabattProzent } from "@/lib/utils/preis";
import type { ProduktListItem } from "@/types/produkt";

interface ProduktKarteProps {
  produkt:   ProduktListItem & { era?: string | null };
  priority?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktKarte — Handoff B1 Catalog-Card auf Paper.
 * Bild: ratio 4/5 + absolute Heart-Button top-right (paper/85 + blur).
 * Info: 18px Padding-Top, 2-col flex (links eyebrow+title+era, rechts price).
 * Hover: Title bekommt Coral-Underline 1px.
 * ────────────────────────────────────────────────────────────────────────── */
export function ProduktKarte({ produkt, priority = false }: ProduktKarteProps) {
  const { toggle, istGemerkt, isLoading } = useWunschliste();
  const gemerkt = istGemerkt(produkt.id);
  const rabatt  = produkt.originalpreis
    ? rabattProzent(produkt.preis, produkt.originalpreis)
    : 0;

  const waehrung = (produkt.waehrung as "KZT" | "EUR" | "USD" | "RUB" | undefined) ?? "KZT";

  return (
    <article className="group">
      {/* Bild */}
      <Link
        href={`/katalog/${produkt.slug}`}
        className="block relative overflow-hidden"
        style={{ aspectRatio: "4/5", background: "var(--color-paper-warm)" }}
      >
        {produkt.hauptbild_url ? (
          <Image
            src={produkt.hauptbild_url}
            alt={produkt.name}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            priority={priority}
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 placeholder-stripes"
            style={{
              background:
                "linear-gradient(135deg, #C9B292 0%, #A88B65 50%, #7A5E3F 100%)",
            }}
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {rabatt > 0 && (
            <span
              className="px-2 py-0.5 text-[10px] uppercase font-medium"
              style={{
                background:    "var(--color-coral)",
                color:         "#fff",
                letterSpacing: "0.18em",
              }}
            >
              −{rabatt}%
            </span>
          )}
          {produkt.featured && (
            <span
              className="px-2 py-0.5 text-[10px] uppercase font-medium"
              style={{
                background:    "var(--color-cobalt)",
                color:         "var(--color-coral)",
                letterSpacing: "0.18em",
              }}
            >
              ★ Топ
            </span>
          )}
        </div>

        {/* Wunschliste-Button (32×32 round, paper/85 + blur) */}
        <button
          onClick={(e) => { e.preventDefault(); toggle(produkt.id); }}
          disabled={isLoading}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-50"
          style={{
            background:    "rgba(245, 241, 234, 0.85)",
            backdropFilter:"blur(6px)",
            borderRadius:  "999px",
          }}
          aria-label={gemerkt ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={gemerkt}
        >
          <Heart
            className="w-4 h-4 transition-colors"
            style={{
              color: gemerkt ? "var(--color-coral)" : "var(--color-ink-soft)",
              fill:  gemerkt ? "var(--color-coral)" : "none",
            }}
          />
        </button>
      </Link>

      {/* Info */}
      <div className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {(produkt.kategorie_name || produkt.era) && (
            <p
              className="text-[10px] uppercase font-medium mb-1.5 truncate"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              {produkt.kategorie_name ?? ""}
            </p>
          )}
          <Link href={`/katalog/${produkt.slug}`}>
            <h3
              className="leading-tight group-hover:[text-decoration:underline] group-hover:[text-decoration-color:var(--color-coral)] group-hover:[text-decoration-thickness:1px] group-hover:[text-underline-offset:4px] transition-all line-clamp-2"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   22,
                color:      "var(--color-ink)",
              }}
            >
              {produkt.name}
            </h3>
          </Link>
          {produkt.era && (
            <p
              className="mt-1 text-[13px]"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              {produkt.era}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="text-right shrink-0">
          {produkt.b2c_mode === "teaser" ? (
            <Link
              href="/kunde/registrieren?tab=business"
              className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
            >
              Pro →
            </Link>
          ) : (
            <>
              <p
                className="text-[10px] uppercase"
                style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
              >
                ₸
              </p>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize:   20,
                  color:      "var(--color-ink)",
                  lineHeight: 1,
                  marginTop:  2,
                }}
              >
                {formatPreis(produkt.preis, waehrung).replace(/^[^\d-]+/, "")}
              </p>
              {produkt.originalpreis && (
                <p
                  className="text-[11px] line-through mt-0.5"
                  style={{ color: "var(--color-ink-mute)" }}
                >
                  {formatPreis(produkt.originalpreis, waehrung)}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status — verkauft / ausverkauft / Pro */}
      {(produkt.verkauft || produkt.lagerbestand === 0) && (
        <p
          className="mt-2 text-[10px] uppercase font-medium"
          style={{
            letterSpacing: "0.22em",
            color:         produkt.verkauft ? "var(--color-ink-mute)" : "var(--color-coral)",
          }}
        >
          {produkt.verkauft ? "Продано" : "Нет в наличии"}
        </p>
      )}
    </article>
  );
}
