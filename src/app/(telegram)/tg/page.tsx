import { Suspense } from "react";
import { katalogProdukte, neuheitenProdukte, preisRange, eraFacets, materialFacets } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
import { instagramPostsPublic } from "@/lib/db/instagram-archive";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { maskBestandListe } from "@/lib/utils/showcase-mask";
import { TelegramAuthGate } from "./auth-gate";
import { TelegramCatalogClient } from "./catalog-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galerie du Temps · Telegram",
  robots: { index: false, follow: false },     // Mini-App-Pfad nicht für Google
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg — Mini-App-Einstieg + Katalog mit Suche & Kategorie-Filter
 *
 * Server-Component liest die Filter (q/kat/sort) aus den searchParams, lädt
 * die passenden Produkte + alle Kategorien und reicht beides an den Client.
 * Der Client kümmert sich um:
 *  1. Telegram-WebApp-Init + Theme-Sync (via Auth-Gate)
 *  2. Such-Eingabe + Kategorie-Chips → URL-Query (Server-Roundtrip, gecacht)
 *  3. Katalog rendern
 *
 * Warum Server-Filter statt rein Client: die DB-FTS (`plainto_tsquery`) +
 * Kategorie-Counts sind schon vorhanden & gecacht (`katalogProdukte`), und so
 * bleibt die Bestand-Maskierung (Schaufenster-Modus) serverseitig autoritativ.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TelegramMiniAppHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kat?: string; sort?: string; min?: string; max?: string; era?: string; zustand?: string; material?: string; sale?: string }>;
}) {
  const sp       = await searchParams;
  const suche    = (sp.q ?? "").trim() || undefined;
  const kat      = (sp.kat ?? "").trim() || undefined;
  const era      = (sp.era ?? "").trim() || undefined;
  const material = (sp.material ?? "").trim() || undefined;
  const nurReduziert = sp.sale === "1";
  // zustand: nur erlaubte Enum-Werte übernehmen (sonst ignorieren).
  const ZUSTAND_OK = ["sehr_gut", "gut", "akzeptabel", "restauriert"];
  const zustand = ZUSTAND_OK.includes((sp.zustand ?? "").trim()) ? sp.zustand!.trim() : undefined;
  const sort   = sp.sort === "preis_asc" || sp.sort === "preis_desc" || sp.sort === "name"
    ? sp.sort
    : "neu";
  // Preis-Filter: nur positive, endliche Zahlen übernehmen.
  const parsePreis = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const minPreis = parsePreis(sp.min);
  const maxPreis = parsePreis(sp.max);

  const hatFilter = !!suche || !!kat || !!era || !!zustand || !!material || nurReduziert || sort !== "neu" || minPreis !== undefined || maxPreis !== undefined;

  const [data, kategorien, neuheiten, range, eras, materials, igHighlights, kaufenAktiv] = await Promise.all([
    katalogProdukte({
      seite: 1, limit: 48, suche, kategorie: kat, sortierung: sort,
      min_preis: minPreis, max_preis: maxPreis, era, zustand, material,
      nur_reduziert: nurReduziert,
    }).catch(() => ({
      items: [], gesamt: 0, seite: 1, limit: 48, seiten: 0,
    })),
    alleKategorien().catch(() => []),
    // Neuheiten-Strip nur im ungefilterten Einstieg laden.
    hatFilter ? Promise.resolve([]) : neuheitenProdukte(8).catch(() => []),
    preisRange().catch(() => ({ min: 0, max: 0 })),
    eraFacets().catch(() => []),
    materialFacets().catch(() => []),
    // IG-Highlights-Strip nur im ungefilterten Einstieg.
    hatFilter ? Promise.resolve([]) : instagramPostsPublic({ limit: 10 }).catch(() => []),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);

  // Nur Highlights MIT Bild (Cover oder verknüpftes Produktbild) zeigen —
  // ohne Bild wirkt der Strip leer.
  const igStrip = igHighlights
    .map(p => ({
      id:       p.id,
      titel:    p.titel,
      kategorie_name: p.kategorie_name ?? null,
      bild_url: p.thumbnail_url ?? p.produkt_bild_url ?? null,
    }))
    .filter(p => !!p.bild_url)
    .slice(0, 8);

  // Nur Kategorien mit verfügbaren Produkten als Filter-Chips anbieten.
  const katChips = kategorien
    .filter(k => (k.anzahl ?? 0) > 0)
    .map(k => ({ slug: k.slug, name: k.name, anzahl: k.anzahl ?? 0 }));

  return (
    <TelegramAuthGate>
      <Suspense fallback={<div className="p-6">…</div>}>
        <TelegramCatalogClient
          produkte={maskBestandListe(data.items, kaufenAktiv)}
          gesamt={data.gesamt}
          kategorien={katChips}
          neuheiten={maskBestandListe(neuheiten, kaufenAktiv)}
          suche={suche ?? ""}
          aktiveKategorie={kat ?? ""}
          sortierung={sort}
          minPreis={minPreis ?? null}
          maxPreis={maxPreis ?? null}
          preisRange={{ min: Math.floor(range.min ?? 0), max: Math.ceil(range.max ?? 0) }}
          eras={eras.map(e => ({ era: e.era, anzahl: e.anzahl }))}
          aktiveEra={era ?? ""}
          aktiverZustand={zustand ?? ""}
          materialien={materials.map(m => ({ material: m.material, anzahl: m.anzahl }))}
          aktivesMaterial={material ?? ""}
          nurReduziert={nurReduziert}
          instagramHighlights={igStrip}
          waehrung={(data.items[0]?.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT"}
        />
      </Suspense>
    </TelegramAuthGate>
  );
}
