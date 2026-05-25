import { query } from "./index";
import type { Kategorie } from "@/types/produkt";

/** Alle aktiven Kategorien (mit Produktanzahl) */
export async function alleKategorien(): Promise<Kategorie[]> {
  const result = await query<Kategorie>(`
    SELECT
      k.id, k.name, k.slug, k.beschreibung,
      k.eltern_id, k.bild_url, k.sortierung, k.aktiv,
      COUNT(p.id)::int AS anzahl
    FROM sebo.kategorien k
    LEFT JOIN sebo.produkte p
      ON p.kategorie_id = k.id AND p.lagerbestand > 0 AND p.verkauft = false
    WHERE k.aktiv = true
    GROUP BY k.id
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
