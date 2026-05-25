import { query } from "./index";
import type { Produkt, ProduktListItem, PaginierteProdukte } from "@/types/produkt";

// ---------------------------------------------------------------------------
// Öffentliche Produkt-Queries (nur verfügbare, nicht-verkaufte Artikel)
// ---------------------------------------------------------------------------

/**
 * Basis-Filter für öffentliche Produkte
 * - lagerbestand > 0, nicht verkauft, veröffentlicht
 * - b2c_mode ≠ 'hidden' (visible + teaser sind sichtbar; teaser ohne Preis im UI)
 */
const BASE_FILTER = `
  p.lagerbestand > 0
  AND p.verkauft   = false
  AND p.veroeffentlicht_am IS NOT NULL
  AND p.b2c_mode != 'hidden'
`;

/** Featured-Produkte für die Startseite */
export async function featuredProdukte(limit = 8): Promise<ProduktListItem[]> {
  const result = await query<ProduktListItem>(
    `SELECT
       p.id, p.name, p.slug, p.preis, p.originalpreis,
       k.name AS kategorie_name,
       p.zustand, p.lagerbestand, p.verkauft, p.featured, p.b2c_mode,
       p.erstellt_am,
       (SELECT pb.url FROM sebo.produktbilder pb
        WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1)
        AS hauptbild_url
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE ${BASE_FILTER} AND p.featured = true
     ORDER BY p.veroeffentlicht_am DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/** Öffentlicher Katalog mit Filtern + Paginierung */
export async function katalogProdukte(params: {
  seite?:       number;
  limit?:       number;
  suche?:       string;
  kategorie?:   string;   // Slug
  kategorie_id?: number;
  zustand?:     string;
  era?:         string;
  min_preis?:   number;
  max_preis?:   number;
  sortierung?:  string;
}): Promise<PaginierteProdukte> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(48, params.limit ?? 24);
  const offset = (seite - 1) * limit;

  const conds: string[] = [BASE_FILTER];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.suche) {
    conds.push(
      `to_tsvector('german', coalesce(p.name,'') || ' ' || coalesce(p.beschreibung,'') || ' ' || coalesce(p.era,''))
       @@ plainto_tsquery('german', $${idx++})`
    );
    vals.push(params.suche);
  }
  if (params.kategorie) {
    conds.push(`k.slug = $${idx++}`);
    vals.push(params.kategorie);
  }
  if (params.kategorie_id) {
    conds.push(`p.kategorie_id = $${idx++}`);
    vals.push(params.kategorie_id);
  }
  if (params.zustand) {
    conds.push(`p.zustand = $${idx++}`);
    vals.push(params.zustand);
  }
  if (params.era) {
    conds.push(`p.era ILIKE $${idx++}`);
    vals.push(`%${params.era}%`);
  }
  if (params.min_preis !== undefined) {
    conds.push(`p.preis >= $${idx++}`);
    vals.push(params.min_preis);
  }
  if (params.max_preis !== undefined) {
    conds.push(`p.preis <= $${idx++}`);
    vals.push(params.max_preis);
  }

  const where = `WHERE ${conds.join(" AND ")}`;

  const orderMap: Record<string, string> = {
    neu:        "p.veroeffentlicht_am DESC",
    preis_asc:  "p.preis ASC",
    preis_desc: "p.preis DESC",
    name:       "p.name ASC",
  };
  const orderBy = orderMap[params.sortierung ?? "neu"] ?? "p.veroeffentlicht_am DESC";

  const [countRes, dataRes] = await Promise.all([
    query<{ gesamt: number }>(
      `SELECT COUNT(*)::int AS gesamt
       FROM sebo.produkte p
       LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
       ${where}`,
      vals
    ),
    query<ProduktListItem>(
      `SELECT
         p.id, p.name, p.slug, p.preis, p.originalpreis,
         k.name AS kategorie_name,
         p.zustand, p.lagerbestand, p.verkauft, p.featured, p.era, p.b2c_mode,
         p.erstellt_am,
         (SELECT pb.url FROM sebo.produktbilder pb
          WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1)
          AS hauptbild_url
       FROM sebo.produkte p
       LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
       ${where}
       ORDER BY p.featured DESC, ${orderBy}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = countRes.rows[0]?.gesamt ?? 0;
  return { items: dataRes.rows, gesamt, seite, limit, seiten: Math.ceil(gesamt / limit) };
}

/** Einzelnes Produkt per Slug (öffentlich) */
export async function oeffentlichesProduktBySlug(slug: string): Promise<Produkt | null> {
  const result = await query<Produkt>(
    `SELECT
       p.*,
       k.name AS kategorie_name,
       COALESCE(
         json_agg(
           json_build_object(
             'id', pb.id, 'url', pb.url, 'alt_text', pb.alt_text,
             'sortierung', pb.sortierung, 'ist_hauptbild', pb.ist_hauptbild
           ) ORDER BY pb.sortierung, pb.erstellt_am
         ) FILTER (WHERE pb.id IS NOT NULL), '[]'
       ) AS bilder
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     LEFT JOIN sebo.produktbilder pb ON pb.produkt_id = p.id
     WHERE p.slug = $1 AND p.veroeffentlicht_am IS NOT NULL
     GROUP BY p.id, k.name`,
    [slug]
  );
  return result.rows[0] ?? null;
}

/** Ähnliche Produkte (gleiche Kategorie, ähnlicher Preis) */
export async function aehnlicheProdukte(
  produktId: string,
  kategorieId: number | null,
  preis: number,
  limit = 4
): Promise<ProduktListItem[]> {
  const result = await query<ProduktListItem>(
    `SELECT
       p.id, p.name, p.slug, p.preis, p.originalpreis,
       k.name AS kategorie_name, p.zustand, p.lagerbestand,
       p.verkauft, p.featured, p.erstellt_am,
       (SELECT pb.url FROM sebo.produktbilder pb
        WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1)
        AS hauptbild_url
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE ${BASE_FILTER}
       AND p.id != $1
       AND ($2::int IS NULL OR p.kategorie_id = $2)
       AND ABS(p.preis - $3) / NULLIF($3, 0) <= 0.5
     ORDER BY ABS(p.preis - $3), p.featured DESC
     LIMIT $4`,
    [produktId, kategorieId, preis, limit]
  );
  return result.rows;
}

/** Preisrange für Filter-UI */
export async function preisRange(): Promise<{ min: number; max: number }> {
  const result = await query<{ min: number; max: number }>(
    `SELECT MIN(preis)::float AS min, MAX(preis)::float AS max
     FROM sebo.produkte
     WHERE ${BASE_FILTER}`
  );
  return result.rows[0] ?? { min: 0, max: 10000 };
}
