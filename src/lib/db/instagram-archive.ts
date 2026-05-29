import { query } from "./index";
import { generateSlug } from "@/lib/utils/slug";

/* ──────────────────────────────────────────────────────────────────────────
 * Instagram-Archiv — DB-Layer.
 *
 * Eigene Kategorien (getrennt von Produkt-Kategorien) + Posts mit kanonischem
 * Permalink/Shortcode und optionaler Produkt-Verknüpfung. Public-Queries geben
 * nur aktive Einträge zurück; Admin-Queries alles.
 * ────────────────────────────────────────────────────────────────────────── */

export interface InstagramKategorie {
  id:          number;
  name:        string;
  slug:        string;
  sortierung:  number;
  aktiv:       boolean;
  erstellt_am: string;
  anzahl?:     number;   // Post-Count (nur in einigen Queries)
}

export interface InstagramPost {
  id:                string;
  permalink:         string;
  shortcode:         string;
  typ:               "p" | "reel" | "tv";
  kategorie_id:      number | null;
  produkt_id:        string | null;
  brand_id:          string | null;
  titel:             string | null;
  sortierung:        number;
  aktiv:             boolean;
  erstellt_am:       string;
  kanal_gepostet_am: string | null;
  thumbnail_url:     string | null;
  // joined
  kategorie_name?:   string | null;
  kategorie_slug?:   string | null;
  produkt_slug?:     string | null;
  produkt_name?:     string | null;
  produkt_bild_url?: string | null;   // Hauptbild des verknüpften Produkts (Fallback-Cover)
}

// ── Public ──────────────────────────────────────────────────────────────────

/** Aktive Kategorien mit Post-Count > 0 — für die Filter-Chips. */
export async function instagramKategorienPublic(): Promise<InstagramKategorie[]> {
  const r = await query<InstagramKategorie>(
    `SELECT k.id, k.name, k.slug, k.sortierung, k.aktiv, k.erstellt_am,
            COUNT(p.id)::int AS anzahl
       FROM sebo.instagram_kategorien k
       JOIN sebo.instagram_posts p
         ON p.kategorie_id = k.id AND p.aktiv = true
      WHERE k.aktiv = true
      GROUP BY k.id
      ORDER BY k.sortierung, k.name`,
  );
  return r.rows;
}

/** Aktive Posts, optional nach Kategorie-Slug gefiltert + optional limitiert. */
export async function instagramPostsPublic(params: { kategorie?: string; limit?: number } = {}): Promise<InstagramPost[]> {
  const conds = ["p.aktiv = true"];
  const vals: unknown[] = [];
  let idx = 1;
  if (params.kategorie) {
    conds.push(`k.slug = $${idx++}`);
    vals.push(params.kategorie);
  }
  let limitSql = "";
  if (params.limit && Number.isFinite(params.limit)) {
    limitSql = ` LIMIT $${idx++}`;
    vals.push(Math.min(50, Math.max(1, Math.floor(params.limit))));
  }
  const r = await query<InstagramPost>(
    `SELECT p.id, p.permalink, p.shortcode, p.typ, p.kategorie_id, p.produkt_id,
            p.titel, p.sortierung, p.aktiv, p.erstellt_am,
            k.name AS kategorie_name, k.slug AS kategorie_slug,
            pr.slug AS produkt_slug, pr.name AS produkt_name,
            pr.hauptbild_url AS produkt_bild_url, p.thumbnail_url
       FROM sebo.instagram_posts p
       LEFT JOIN sebo.instagram_kategorien k ON k.id = p.kategorie_id
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
      WHERE ${conds.join(" AND ")}
      ORDER BY p.sortierung, p.erstellt_am DESC${limitSql}`,
    vals,
  );
  return r.rows;
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function instagramKategorienAlle(): Promise<InstagramKategorie[]> {
  const r = await query<InstagramKategorie>(
    `SELECT k.id, k.name, k.slug, k.sortierung, k.aktiv, k.erstellt_am,
            (SELECT COUNT(*)::int FROM sebo.instagram_posts p WHERE p.kategorie_id = k.id) AS anzahl
       FROM sebo.instagram_kategorien k
      ORDER BY k.sortierung, k.name`,
  );
  return r.rows;
}

export async function instagramKategorieErstellen(name: string): Promise<InstagramKategorie> {
  let slug = generateSlug(name);
  const exists = await query(`SELECT 1 FROM sebo.instagram_kategorien WHERE slug = $1`, [slug]);
  if ((exists.rowCount ?? 0) > 0) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const r = await query<InstagramKategorie>(
    `INSERT INTO sebo.instagram_kategorien (name, slug)
     VALUES ($1, $2)
     RETURNING id, name, slug, sortierung, aktiv, erstellt_am`,
    [name.trim(), slug],
  );
  return r.rows[0];
}

export async function instagramPostsAlle(): Promise<InstagramPost[]> {
  const r = await query<InstagramPost>(
    `SELECT p.id, p.permalink, p.shortcode, p.typ, p.kategorie_id, p.produkt_id, p.brand_id,
            p.titel, p.sortierung, p.aktiv, p.erstellt_am, p.kanal_gepostet_am,
            k.name AS kategorie_name, k.slug AS kategorie_slug,
            pr.slug AS produkt_slug, pr.name AS produkt_name,
            pr.hauptbild_url AS produkt_bild_url, p.thumbnail_url
       FROM sebo.instagram_posts p
       LEFT JOIN sebo.instagram_kategorien k ON k.id = p.kategorie_id
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
      ORDER BY p.sortierung, p.erstellt_am DESC`,
  );
  return r.rows;
}

/** Aktive Posts die mit einem bestimmten Produkt verknüpft sind — für die Produktdetailseite. */
export async function instagramPostsFuerProdukt(produktId: string): Promise<InstagramPost[]> {
  const r = await query<InstagramPost>(
    `SELECT p.id, p.permalink, p.shortcode, p.typ, p.kategorie_id, p.produkt_id,
            p.titel, p.sortierung, p.aktiv, p.erstellt_am, p.kanal_gepostet_am,
            k.name AS kategorie_name, k.slug AS kategorie_slug,
            pr.slug AS produkt_slug, pr.name AS produkt_name,
            pr.hauptbild_url AS produkt_bild_url, p.thumbnail_url
       FROM sebo.instagram_posts p
       LEFT JOIN sebo.instagram_kategorien k ON k.id = p.kategorie_id
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
      WHERE p.produkt_id = $1 AND p.aktiv = true
      ORDER BY p.sortierung, p.erstellt_am DESC`,
    [produktId],
  );
  return r.rows;
}

/** Einzelnen Post mit joins — für den Kanal-Broadcast. */
export async function instagramPostById(id: string): Promise<InstagramPost | null> {
  const r = await query<InstagramPost>(
    `SELECT p.id, p.permalink, p.shortcode, p.typ, p.kategorie_id, p.produkt_id,
            p.titel, p.sortierung, p.aktiv, p.erstellt_am, p.kanal_gepostet_am,
            k.name AS kategorie_name, k.slug AS kategorie_slug,
            pr.slug AS produkt_slug, pr.name AS produkt_name,
            pr.hauptbild_url AS produkt_bild_url, p.thumbnail_url
       FROM sebo.instagram_posts p
       LEFT JOIN sebo.instagram_kategorien k ON k.id = p.kategorie_id
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
      WHERE p.id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
}

/** Idempotenz-Stempel nach manuellem Kanal-Broadcast. */
export async function instagramPostKanalMarkieren(id: string): Promise<void> {
  try {
    await query(`UPDATE sebo.instagram_posts SET kanal_gepostet_am = now() WHERE id = $1`, [id]);
  } catch { /* best-effort */ }
}

export async function instagramPostErstellen(input: {
  permalink:   string;
  shortcode:   string;
  typ:         "p" | "reel" | "tv";
  kategorieId?:  number | null;
  produktId?:    string | null;
  brandId?:      string | null;
  titel?:        string | null;
  thumbnailUrl?: string | null;
}): Promise<InstagramPost> {
  const r = await query<InstagramPost>(
    `INSERT INTO sebo.instagram_posts (permalink, shortcode, typ, kategorie_id, produkt_id, brand_id, titel, thumbnail_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, permalink, shortcode, typ, kategorie_id, produkt_id, brand_id, titel, sortierung, aktiv, erstellt_am, kanal_gepostet_am, thumbnail_url`,
    [input.permalink, input.shortcode, input.typ, input.kategorieId ?? null, input.produktId ?? null, input.brandId ?? null, input.titel?.trim() || null, input.thumbnailUrl?.trim() || null],
  );
  return r.rows[0];
}

export async function instagramPostAktualisieren(
  id: string,
  input: { kategorieId?: number | null; produktId?: string | null; brandId?: string | null; titel?: string | null; aktiv?: boolean; sortierung?: number; thumbnailUrl?: string | null },
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  if (input.kategorieId !== undefined) { sets.push(`kategorie_id = $${idx++}`); vals.push(input.kategorieId); }
  if (input.produktId   !== undefined) { sets.push(`produkt_id = $${idx++}`);   vals.push(input.produktId); }
  if (input.brandId     !== undefined) { sets.push(`brand_id = $${idx++}`);     vals.push(input.brandId); }
  if (input.titel       !== undefined) { sets.push(`titel = $${idx++}`);        vals.push(input.titel?.trim() || null); }
  if (input.aktiv       !== undefined) { sets.push(`aktiv = $${idx++}`);        vals.push(input.aktiv); }
  if (input.sortierung  !== undefined) { sets.push(`sortierung = $${idx++}`);   vals.push(input.sortierung); }
  if (input.thumbnailUrl !== undefined){ sets.push(`thumbnail_url = $${idx++}`); vals.push(input.thumbnailUrl?.trim() || null); }
  if (sets.length === 0) return;
  vals.push(id);
  await query(`UPDATE sebo.instagram_posts SET ${sets.join(", ")} WHERE id = $${idx}`, vals);
}

export async function instagramPostLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.instagram_posts WHERE id = $1`, [id]);
}

/** Setzt die Sortierung anhand der übergebenen Reihenfolge (Index = sortierung). */
export async function instagramPostsSortierungSetzen(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  await query(
    `UPDATE sebo.instagram_posts AS p
        SET sortierung = o.ord
       FROM unnest($1::uuid[]) WITH ORDINALITY AS o(id, ord)
      WHERE p.id = o.id`,
    [orderedIds],
  );
}
