import { query } from "./index";
import { generateSlug, uniqueSlug } from "@/lib/utils/slug";
import type { JournalPost } from "@/types/newsletter";
import type { LandingBlock } from "@/types/landing";

export async function veroeffentlichtePosts(limit = 20): Promise<JournalPost[]> {
  const r = await query<JournalPost>(
    `SELECT * FROM sebo.journal_posts
     WHERE veroeffentlicht = true AND veroeffentlicht_am <= now()
     ORDER BY veroeffentlicht_am DESC
     LIMIT $1`,
    [limit]
  );
  return r.rows;
}

/** Ähnliche Posts (gleiche Tags) für „Verwandte Artikel" am Detail-Seitenende.
 *  Fallback: wenn der Post keine Tags hat → die neuesten anderen Posts. */
export async function aehnlichePosts(
  slug: string,
  tags: string[],
  limit = 3,
): Promise<JournalPost[]> {
  if (tags.length > 0) {
    const r = await query<JournalPost>(
      `SELECT *,
              cardinality(ARRAY(SELECT unnest(tags) INTERSECT SELECT unnest($2::text[]))) AS overlap
       FROM sebo.journal_posts
       WHERE veroeffentlicht = true
         AND slug <> $1
         AND tags && $2::text[]
       ORDER BY overlap DESC, veroeffentlicht_am DESC
       LIMIT $3`,
      [slug, tags, limit]
    );
    if (r.rows.length > 0) return r.rows;
  }
  // Fallback: latest other posts
  const r = await query<JournalPost>(
    `SELECT * FROM sebo.journal_posts
     WHERE veroeffentlicht = true AND slug <> $1
     ORDER BY veroeffentlicht_am DESC
     LIMIT $2`,
    [slug, limit]
  );
  return r.rows;
}

/** Garantiert `blocks: []` statt undefined/null (z.B. wenn Migration 060
 *  noch nicht angewendet wurde → Spalte fehlt → SELECT * liefert kein blocks). */
function normalize(p: JournalPost | undefined): JournalPost | null {
  if (!p) return null;
  if (!Array.isArray(p.blocks)) p.blocks = [];
  return p;
}

export async function postBySlug(slug: string): Promise<JournalPost | null> {
  const r = await query<JournalPost>(
    `SELECT * FROM sebo.journal_posts WHERE slug = $1`,
    [slug]
  );
  return normalize(r.rows[0]);
}

export async function postAufrufenInkrement(slug: string): Promise<void> {
  await query(
    `UPDATE sebo.journal_posts SET aufrufe = aufrufe + 1 WHERE slug = $1`,
    [slug]
  );
}

export async function allePostsAdmin(): Promise<JournalPost[]> {
  const r = await query<JournalPost>(`SELECT * FROM sebo.journal_posts ORDER BY erstellt_am DESC LIMIT 200`);
  return r.rows;
}

export async function postById(id: string): Promise<JournalPost | null> {
  const r = await query<JournalPost>(`SELECT * FROM sebo.journal_posts WHERE id = $1`, [id]);
  return normalize(r.rows[0]);
}

export async function postErstellen(data: {
  titel:        string;
  autor_id?:    string;
  autor_name?:  string;
}): Promise<JournalPost> {
  let slug = generateSlug(data.titel);
  const existing = await query(`SELECT 1 FROM sebo.journal_posts WHERE slug = $1`, [slug]);
  if ((existing.rowCount ?? 0) > 0) slug = uniqueSlug(data.titel);

  const r = await query<JournalPost>(
    `INSERT INTO sebo.journal_posts (titel, slug, autor_id, autor_name)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.titel, slug, data.autor_id ?? null, data.autor_name ?? null]
  );
  return r.rows[0];
}

export async function postAktualisieren(id: string, data: {
  titel?:           string;
  excerpt?:         string;
  cover_bild_url?:  string;
  markdown?:        string;
  blocks?:          LandingBlock[];
  tags?:            string[];
  brand_id?:        string | null;
  seo_titel?:       string;
  seo_beschreibung?: string;
  veroeffentlicht?: boolean;
}): Promise<void> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === "tags") {
      felder.push(`tags = $${idx++}::text[]`);
      werte.push(value);
    } else if (key === "blocks") {
      felder.push(`blocks = $${idx++}::jsonb`);
      werte.push(JSON.stringify(value));
    } else if (key === "veroeffentlicht") {
      felder.push(`veroeffentlicht = $${idx++}`);
      werte.push(value);
      if (value === true) {
        felder.push(`veroeffentlicht_am = COALESCE(veroeffentlicht_am, now())`);
      }
    } else {
      felder.push(`${key} = $${idx++}`);
      werte.push(value);
    }
  }
  if (felder.length === 0) return;

  werte.push(id);
  await query(`UPDATE sebo.journal_posts SET ${felder.join(", ")} WHERE id = $${idx}`, werte);
}

export async function postLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.journal_posts WHERE id = $1`, [id]);
}
