import type { MetadataRoute } from "next";
import { query } from "@/lib/db";

const BASE_URL =
  process.env.NEXTAUTH_URL ?? "https://galeriedutemps.kz";

export const revalidate = 3600;   // stündlich neu generieren

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Statische Seiten
  const statisch: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,             changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/katalog`,      changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE_URL}/about`,        changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakt`,      changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dynamische Routen aus DB (Best-Effort: Fehler ignorieren)
  let produkte: { slug: string; aktualisiert_am: string }[] = [];
  let kategorien: { slug: string }[] = [];

  try {
    const pRes = await query<{ slug: string; aktualisiert_am: string }>(
      `SELECT slug, aktualisiert_am FROM sebo.produkte
       WHERE veroeffentlicht_am IS NOT NULL
         AND verkauft = false
         AND lagerbestand > 0
       ORDER BY aktualisiert_am DESC
       LIMIT 5000`
    );
    produkte = pRes.rows;
  } catch (err) {
    console.warn("[sitemap] Produkte konnten nicht geladen werden:", err);
  }

  try {
    const kRes = await query<{ slug: string }>(
      `SELECT slug FROM sebo.kategorien WHERE aktiv = true`
    );
    kategorien = kRes.rows;
  } catch (err) {
    console.warn("[sitemap] Kategorien konnten nicht geladen werden:", err);
  }

  const dynamischeProdukte: MetadataRoute.Sitemap = produkte.map(p => ({
    url:             `${BASE_URL}/katalog/${p.slug}`,
    lastModified:    new Date(p.aktualisiert_am),
    changeFrequency: "weekly",
    priority:        0.7,
  }));

  const dynamischeKategorien: MetadataRoute.Sitemap = kategorien.map(k => ({
    url:             `${BASE_URL}/kategorien/${k.slug}`,
    changeFrequency: "weekly",
    priority:        0.6,
  }));

  return [...statisch, ...dynamischeKategorien, ...dynamischeProdukte];
}
