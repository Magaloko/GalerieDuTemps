import { Suspense } from "react";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { alleKategorien } from "@/lib/db/kategorien";
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
  searchParams: Promise<{ q?: string; kat?: string; sort?: string }>;
}) {
  const sp     = await searchParams;
  const suche  = (sp.q ?? "").trim() || undefined;
  const kat    = (sp.kat ?? "").trim() || undefined;
  const sort   = sp.sort === "preis_asc" || sp.sort === "preis_desc" || sp.sort === "name"
    ? sp.sort
    : "neu";

  const [data, kategorien, kaufenAktiv] = await Promise.all([
    katalogProdukte({ seite: 1, limit: 48, suche, kategorie: kat, sortierung: sort }).catch(() => ({
      items: [], gesamt: 0, seite: 1, limit: 48, seiten: 0,
    })),
    alleKategorien().catch(() => []),
    isFeatureEnabled("kaufen_aktiv").catch(() => true),
  ]);

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
          suche={suche ?? ""}
          aktiveKategorie={kat ?? ""}
          sortierung={sort}
        />
      </Suspense>
    </TelegramAuthGate>
  );
}
