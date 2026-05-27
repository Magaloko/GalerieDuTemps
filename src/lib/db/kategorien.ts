import { unstable_cache } from "next/cache";
import { query } from "./index";
import { generateSlug, uniqueSlug } from "@/lib/utils/slug";
import {
  PUBLIC_CATEGORIES_TAG,
  PUBLIC_CATALOG_REVALIDATE_SECONDS,
  revalidatePublicCatalogCache,
} from "@/lib/cache/public-catalog";
import type { Kategorie } from "@/types/produkt";

export interface KategorieInput {
  name:         string;
  slug?:        string;
  code?:        string | null;
  beschreibung?: string | null;
  eltern_id?:   number | null;
  bild_url?:    string | null;
  sortierung?:  number;
  aktiv?:       boolean;
}

/** Alle aktiven Kategorien (mit Produktanzahl) — für Public-Seiten + Filter
 *  Counts spiegeln die exakten Filter aus produkte-public BASE_FILTER wieder.
 */
async function alleKategorienUncached(): Promise<Kategorie[]> {
  const result = await query<Kategorie>(`
    SELECT
      k.id, k.code, k.name, k.slug, k.beschreibung,
      k.eltern_id, k.bild_url, k.sortierung, k.aktiv,
      COUNT(p.id)::int AS anzahl
    FROM sebo.kategorien k
    LEFT JOIN sebo.produkte p
      ON p.kategorie_id = k.id
     AND p.aktiv = true
     AND p.lagerbestand > 0
     AND p.verkauft = false
     AND p.veroeffentlicht_am IS NOT NULL
     AND p.b2c_mode != 'hidden'
    WHERE k.aktiv = true
    GROUP BY k.id
    ORDER BY k.sortierung, k.name
  `);
  return result.rows;
}

export const alleKategorien = unstable_cache(
  alleKategorienUncached,
  ["public-kategorien"],
  { tags: [PUBLIC_CATEGORIES_TAG], revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS },
);

/** Alle Kategorien inkl. inaktiv — für Admin */
export async function alleKategorienAdmin(): Promise<Kategorie[]> {
  const result = await query<Kategorie>(`
    SELECT
      k.id, k.code, k.name, k.slug, k.beschreibung,
      k.eltern_id, k.bild_url, k.sortierung, k.aktiv,
      e.name AS eltern_name,
      COUNT(p.id)::int AS anzahl
    FROM sebo.kategorien k
    LEFT JOIN sebo.kategorien e ON e.id = k.eltern_id
    LEFT JOIN sebo.produkte p   ON p.kategorie_id = k.id
    GROUP BY k.id, e.name
    ORDER BY k.sortierung, k.name
  `);
  return result.rows;
}

/** Kategorie per ID */
export async function kategorieById(id: number): Promise<Kategorie | null> {
  const result = await query<Kategorie>(
    `SELECT * FROM sebo.kategorien WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/** Neue Kategorie anlegen */
export async function kategorieErstellen(input: KategorieInput): Promise<Kategorie> {
  let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  const existing = await query(
    `SELECT 1 FROM sebo.kategorien WHERE slug = $1`,
    [slug]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    slug = uniqueSlug(input.name);
  }

  const result = await query<{ id: number }>(
    `INSERT INTO sebo.kategorien
       (name, slug, code, beschreibung, eltern_id, bild_url, sortierung, aktiv)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      input.name,
      slug,
      input.code         ?? null,
      input.beschreibung ?? null,
      input.eltern_id    ?? null,
      input.bild_url     ?? null,
      input.sortierung   ?? 0,
      input.aktiv        ?? true,
    ]
  );
  revalidatePublicCatalogCache();
  return kategorieById(result.rows[0].id) as Promise<Kategorie>;
}

/** Kategorie aktualisieren — nur gesetzte Felder werden überschrieben */
export async function kategorieAktualisieren(
  id:    number,
  input: Partial<KategorieInput>
): Promise<Kategorie | null> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  const mappings: Array<[keyof KategorieInput, string]> = [
    ["name",         "name"],
    ["slug",         "slug"],
    ["code",         "code"],
    ["beschreibung", "beschreibung"],
    ["eltern_id",    "eltern_id"],
    ["bild_url",     "bild_url"],
    ["sortierung",   "sortierung"],
    ["aktiv",        "aktiv"],
  ];

  for (const [key, col] of mappings) {
    if (key in input && input[key] !== undefined) {
      felder.push(`${col} = $${idx++}`);
      werte.push(input[key] ?? null);
    }
  }

  if (felder.length === 0) return kategorieById(id);

  werte.push(id);
  await query(
    `UPDATE sebo.kategorien SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );
  revalidatePublicCatalogCache();
  return kategorieById(id);
}

/**
 * Kategorie löschen oder soft-deaktivieren.
 * Wenn Produkte verlinkt sind, wird nur `aktiv=false` gesetzt (Soft-Delete).
 * Wenn keine Produkte verlinkt sind, wird hart gelöscht.
 * Returns: { mode: "soft" | "hard" }
 */
export async function kategorieLoeschen(id: number): Promise<{ mode: "soft" | "hard" } | null> {
  const linkedRes = await query<{ anzahl: number }>(
    `SELECT COUNT(*)::int AS anzahl FROM sebo.produkte WHERE kategorie_id = $1`,
    [id]
  );
  const verlinkt = (linkedRes.rows[0]?.anzahl ?? 0) > 0;

  if (verlinkt) {
    await query(`UPDATE sebo.kategorien SET aktiv = false WHERE id = $1`, [id]);
    revalidatePublicCatalogCache();
    return { mode: "soft" };
  }

  const del = await query(`DELETE FROM sebo.kategorien WHERE id = $1`, [id]);
  if ((del.rowCount ?? 0) > 0) revalidatePublicCatalogCache();
  return (del.rowCount ?? 0) > 0 ? { mode: "hard" } : null;
}
