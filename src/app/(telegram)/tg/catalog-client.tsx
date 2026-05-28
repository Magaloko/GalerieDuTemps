"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPreis } from "@/lib/utils/preis";
import { HeartToggle } from "./heart-toggle";
import type { ProduktListItem } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Catalog
 *
 * 2-Spalten-Grid, kompakt — passt sich Telegram-WebView (typisch 360–414px)
 * an. Karten verlinken nach /tg/produkt/<slug> (separate Route, Detail-Page
 * macht Add-to-Cart über Telegram-MainButton statt eigene Buttons).
 *
 * Theme: nutzt --tg-theme-* CSS-Variablen die Telegram setzt (vom Layout
 * mit unseren Brand-Farben als Fallback gemerged).
 * ────────────────────────────────────────────────────────────────────────── */
export function TelegramCatalogClient({
  produkte,
}: {
  produkte: (ProduktListItem & { era?: string | null })[];
}) {
  return (
    <main className="p-4">
      <header className="mb-5">
        <p
          className="text-[10px] uppercase font-medium mb-2"
          style={{
            letterSpacing: "0.28em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          Каталог
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            lineHeight: 1.05,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          Galerie du Temps
        </h1>
        <p
          className="mt-1 text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          {produkte.length} {produkte.length === 1 ? "предмет" : "предметов"}
        </p>
      </header>

      {produkte.length === 0 ? (
        <div className="py-16 text-center">
          <p style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            Каталог пуст.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {produkte.map(p => (
            <MiniCard key={p.id} produkt={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function MiniCard({ produkt }: { produkt: ProduktListItem & { era?: string | null } }) {
  const waehrung = (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
  return (
    <Link
      href={`/tg/produkt/${produkt.slug}`}
      className="block group"
      style={{ touchAction: "manipulation" }}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: "4/5",
          background:  "var(--color-paper-warm)",
        }}
      >
        {produkt.hauptbild_url && (
          <Image
            src={produkt.hauptbild_url}
            alt={produkt.name}
            fill
            sizes="(max-width:768px) 50vw, 200px"
            className="object-cover"
          />
        )}
        <HeartToggle produktId={produkt.id} overlay size={16} />
      </div>
      <div className="pt-2">
        {produkt.kategorie_name && (
          <p
            className="text-[9px] uppercase font-medium truncate"
            style={{
              letterSpacing: "0.18em",
              color:         "var(--tg-theme-link-color, var(--color-coral))",
            }}
          >
            {produkt.kategorie_name}
          </p>
        )}
        <h3
          className="line-clamp-2 mt-0.5"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   16,
            lineHeight: 1.15,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          {produkt.name}
        </h3>
        <p
          className="mt-1"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   15,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          {formatPreis(produkt.preis, waehrung)}
        </p>
      </div>
    </Link>
  );
}
