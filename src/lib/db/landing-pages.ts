import { query, withTransaction } from "./index";
import { generateSlug } from "@/lib/utils/slug";
import type { LandingPage, LandingBlock, LandingStatus } from "@/types/landing";
import type { ProduktListItem } from "@/types/produkt";

// ---------------------------------------------------------------------------
// Landing-Pages — Block-basierter Builder (sebo.landing_pages, sql/059).
// ---------------------------------------------------------------------------

const COLS = `
  id, slug, titel, status, blocks, ist_startseite,
  seo_titel, seo_beschreibung, brand_id, erstellt_am, aktualisiert_am
`;

/** Alle Landing-Pages (Admin-Liste, neueste zuerst). */
export async function landingPagesAlle(): Promise<LandingPage[]> {
  const r = await query<LandingPage>(
    `SELECT ${COLS} FROM sebo.landing_pages ORDER BY aktualisiert_am DESC LIMIT 200`,
  );
  return r.rows;
}

export async function landingPageById(id: string): Promise<LandingPage | null> {
  const r = await query<LandingPage>(
    `SELECT ${COLS} FROM sebo.landing_pages WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
}

/**
 * Landing-Page per Slug. Mit `nurVeroeffentlicht` (Public-Route) wird nur eine
 * veröffentlichte Seite zurückgegeben — sonst 404.
 */
export async function landingPageBySlug(
  slug: string,
  nurVeroeffentlicht = false,
): Promise<LandingPage | null> {
  const cond = nurVeroeffentlicht ? `AND status = 'veroeffentlicht'` : "";
  const r = await query<LandingPage>(
    `SELECT ${COLS} FROM sebo.landing_pages WHERE slug = $1 ${cond}`,
    [slug],
  );
  return r.rows[0] ?? null;
}

/** Die (eine) veröffentlichte Startseite, falls gesetzt. */
export async function landingStartseite(): Promise<LandingPage | null> {
  const r = await query<LandingPage>(
    `SELECT ${COLS} FROM sebo.landing_pages
     WHERE ist_startseite = true AND status = 'veroeffentlicht'
     LIMIT 1`,
  );
  return r.rows[0] ?? null;
}

/** Eindeutigen Slug erzeugen (hängt -2, -3 … an, falls belegt). */
async function eindeutigerSlug(wunsch: string, ausserId?: string): Promise<string> {
  const basis = generateSlug(wunsch) || "seite";
  let kandidat = basis;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await query<{ id: string }>(
      `SELECT id FROM sebo.landing_pages WHERE slug = $1 ${ausserId ? "AND id <> $2" : ""} LIMIT 1`,
      ausserId ? [kandidat, ausserId] : [kandidat],
    );
    if (r.rows.length === 0) return kandidat;
    n += 1;
    kandidat = `${basis}-${n}`;
  }
}

export async function landingPageErstellen(data: {
  slug: string;
  titel: string;
}): Promise<LandingPage> {
  const slug = await eindeutigerSlug(data.slug || data.titel);
  const r = await query<LandingPage>(
    `INSERT INTO sebo.landing_pages (slug, titel) VALUES ($1, $2) RETURNING ${COLS}`,
    [slug, data.titel],
  );
  return r.rows[0];
}

export async function landingPageAktualisieren(
  id: string,
  data: {
    titel?: string;
    slug?: string;
    blocks?: LandingBlock[];
    status?: LandingStatus;
    seo_titel?: string | null;
    seo_beschreibung?: string | null;
    brand_id?: string | null;
  },
): Promise<void> {
  const felder: string[] = [];
  const werte: unknown[] = [];
  let idx = 1;

  if (data.slug !== undefined) {
    const slug = await eindeutigerSlug(data.slug, id);
    felder.push(`slug = $${idx++}`);
    werte.push(slug);
  }
  if (data.titel !== undefined) {
    felder.push(`titel = $${idx++}`);
    werte.push(data.titel);
  }
  if (data.blocks !== undefined) {
    felder.push(`blocks = $${idx++}::jsonb`);
    werte.push(JSON.stringify(data.blocks));
  }
  if (data.status !== undefined) {
    felder.push(`status = $${idx++}`);
    werte.push(data.status);
  }
  if (data.seo_titel !== undefined) {
    felder.push(`seo_titel = $${idx++}`);
    werte.push(data.seo_titel);
  }
  if (data.seo_beschreibung !== undefined) {
    felder.push(`seo_beschreibung = $${idx++}`);
    werte.push(data.seo_beschreibung);
  }
  if (data.brand_id !== undefined) {
    felder.push(`brand_id = $${idx++}`);
    werte.push(data.brand_id);
  }

  felder.push(`aktualisiert_am = now()`);
  if (felder.length === 1) return; // nur aktualisiert_am → nichts zu tun

  werte.push(id);
  await query(
    `UPDATE sebo.landing_pages SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte,
  );
}

export async function landingPageLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.landing_pages WHERE id = $1`, [id]);
}

/**
 * Produkte für den product_grid-Block (quelle=slugs) — nur öffentlich
 * sichtbare, in der Reihenfolge der übergebenen Slugs. Liefert
 * ProduktListItem-kompatible Zeilen (wie produkte-public.ts).
 */
export async function landingProdukteBySlugs(
  slugs: string[],
): Promise<ProduktListItem[]> {
  const clean = slugs.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return [];
  const r = await query<ProduktListItem>(
    `SELECT
       p.id, p.name, p.slug, p.preis, p.originalpreis, p.waehrung,
       k.name AS kategorie_name,
       p.zustand, p.lagerbestand, p.verkauft, p.featured, p.b2c_mode,
       p.erstellt_am, p.era, p.material, p.herkunft,
       (p.reserviert_bis IS NOT NULL AND p.reserviert_bis > now() AND p.verkauft = false) AS reserviert,
       (SELECT COUNT(*)::int FROM sebo.produktbilder pb WHERE pb.produkt_id = p.id) AS bilder_count,
       COALESCE(
         p.hauptbild_url,
         (SELECT COALESCE(pb.url_medium, pb.url)
            FROM sebo.produktbilder pb
           WHERE pb.produkt_id = p.id
           ORDER BY pb.ist_hauptbild DESC, pb.sortierung, pb.erstellt_am
           LIMIT 1)
       ) AS hauptbild_url
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE p.slug = ANY($1::text[])
       AND p.aktiv = true
       AND p.lagerbestand > 0
       AND p.verkauft = false
       AND p.veroeffentlicht_am IS NOT NULL
       AND p.b2c_mode != 'hidden'
     ORDER BY array_position($1::text[], p.slug)`,
    [clean],
  );
  return r.rows;
}

/**
 * Setzt die Startseite. `id = null` entfernt die Startseite ganz.
 * In einer Transaktion: erst alle auf false, dann die gewählte auf true —
 * so kollidiert der Partial-Unique-Index nie.
 */
export async function landingPageAlsStartseite(id: string | null): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE sebo.landing_pages SET ist_startseite = false WHERE ist_startseite = true`,
    );
    if (id) {
      await client.query(
        `UPDATE sebo.landing_pages SET ist_startseite = true, aktualisiert_am = now() WHERE id = $1`,
        [id],
      );
    }
  });
}
