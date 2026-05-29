import { query } from "./index";
import { generateSlug } from "@/lib/utils/slug";
import type { Brand, BrandOption, BrandVideo } from "@/types/brand";
import type { LandingBlock } from "@/types/landing";
import type { ProduktListItem } from "@/types/produkt";
import type { JournalPost } from "@/types/newsletter";
import type { InstagramPost } from "./instagram-archive";

// ---------------------------------------------------------------------------
// Brands — Marken-System (sebo.brands, sql/061). Muster wie landing-pages.ts.
//
// JSONB-Felder (beschreibung/videos/intro_blocks) werden von pg als JS-Objekt
// geliefert; normalize() härtet gegen NULL/Fehlform ab.
// ---------------------------------------------------------------------------

const COLS = `
  id, slug, name, logo_url, cover_url, beschreibung, videos, intro_blocks,
  aktiv, sortierung, seo_titel, seo_beschreibung, erstellt_am, aktualisiert_am
`;

function normalize(b: Brand | undefined | null): Brand | null {
  if (!b) return null;
  if (!b.beschreibung || typeof b.beschreibung !== "object") b.beschreibung = {};
  if (!Array.isArray(b.videos)) b.videos = [];
  if (!Array.isArray(b.intro_blocks)) b.intro_blocks = [];
  return b;
}

/** Alle Marken (Admin-Liste, nach Sortierung dann Name). */
export async function brandsAlle(): Promise<Brand[]> {
  const r = await query<Brand>(
    `SELECT ${COLS} FROM sebo.brands ORDER BY sortierung, name LIMIT 500`,
  );
  return r.rows.map((b) => normalize(b)!);
}

/** Aktive Marken als kompakte Optionen (für Selects/Listen). */
export async function brandsAktiv(): Promise<BrandOption[]> {
  const r = await query<BrandOption>(
    `SELECT id, name, slug, logo_url, aktiv
       FROM sebo.brands
      WHERE aktiv = true
      ORDER BY sortierung, name`,
  );
  return r.rows;
}

export async function brandById(id: string): Promise<Brand | null> {
  const r = await query<Brand>(`SELECT ${COLS} FROM sebo.brands WHERE id = $1`, [id]);
  return normalize(r.rows[0]);
}

/** Marke per Slug. Mit `nurAktiv` (Public-Route) nur aktive Marken → sonst null. */
export async function brandBySlug(slug: string, nurAktiv = false): Promise<Brand | null> {
  const cond = nurAktiv ? "AND aktiv = true" : "";
  const r = await query<Brand>(
    `SELECT ${COLS} FROM sebo.brands WHERE slug = $1 ${cond}`,
    [slug],
  );
  return normalize(r.rows[0]);
}

/** Eindeutigen Slug erzeugen (hängt -2, -3 … an, falls belegt). */
async function eindeutigerSlug(wunsch: string, ausserId?: string): Promise<string> {
  const basis = generateSlug(wunsch) || "brand";
  let kandidat = basis;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const r = await query<{ id: string }>(
      `SELECT id FROM sebo.brands WHERE slug = $1 ${ausserId ? "AND id <> $2" : ""} LIMIT 1`,
      ausserId ? [kandidat, ausserId] : [kandidat],
    );
    if (r.rows.length === 0) return kandidat;
    n += 1;
    kandidat = `${basis}-${n}`;
  }
}

export async function brandErstellen(data: { name: string; slug?: string }): Promise<Brand> {
  const slug = await eindeutigerSlug(data.slug || data.name);
  const r = await query<Brand>(
    `INSERT INTO sebo.brands (slug, name) VALUES ($1, $2) RETURNING ${COLS}`,
    [slug, data.name],
  );
  return normalize(r.rows[0])!;
}

export async function brandAktualisieren(
  id: string,
  data: {
    name?: string;
    slug?: string;
    logo_url?: string | null;
    cover_url?: string | null;
    beschreibung?: Record<string, string>;
    videos?: BrandVideo[];
    intro_blocks?: LandingBlock[];
    aktiv?: boolean;
    sortierung?: number;
    seo_titel?: string | null;
    seo_beschreibung?: string | null;
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
  if (data.name !== undefined) { felder.push(`name = $${idx++}`); werte.push(data.name); }
  if (data.logo_url !== undefined) { felder.push(`logo_url = $${idx++}`); werte.push(data.logo_url); }
  if (data.cover_url !== undefined) { felder.push(`cover_url = $${idx++}`); werte.push(data.cover_url); }
  if (data.beschreibung !== undefined) {
    felder.push(`beschreibung = $${idx++}::jsonb`);
    werte.push(JSON.stringify(data.beschreibung ?? {}));
  }
  if (data.videos !== undefined) {
    felder.push(`videos = $${idx++}::jsonb`);
    werte.push(JSON.stringify(Array.isArray(data.videos) ? data.videos : []));
  }
  if (data.intro_blocks !== undefined) {
    felder.push(`intro_blocks = $${idx++}::jsonb`);
    werte.push(JSON.stringify(Array.isArray(data.intro_blocks) ? data.intro_blocks : []));
  }
  if (data.aktiv !== undefined) { felder.push(`aktiv = $${idx++}`); werte.push(data.aktiv); }
  if (data.sortierung !== undefined) { felder.push(`sortierung = $${idx++}`); werte.push(data.sortierung); }
  if (data.seo_titel !== undefined) { felder.push(`seo_titel = $${idx++}`); werte.push(data.seo_titel); }
  if (data.seo_beschreibung !== undefined) { felder.push(`seo_beschreibung = $${idx++}`); werte.push(data.seo_beschreibung); }

  felder.push(`aktualisiert_am = now()`);
  if (felder.length === 1) return; // nur aktualisiert_am → nichts zu tun

  werte.push(id);
  await query(`UPDATE sebo.brands SET ${felder.join(", ")} WHERE id = $${idx}`, werte);
}

export async function brandLoeschen(id: string): Promise<void> {
  // ON DELETE SET NULL entkoppelt die 4 Inhalts-Tabellen automatisch.
  await query(`DELETE FROM sebo.brands WHERE id = $1`, [id]);
}

// ---------------------------------------------------------------------------
// Aggregationen für die öffentliche Brand-Page.
// ---------------------------------------------------------------------------

/** Öffentlich sichtbare Produkte der Marke (Stil wie produkte-public.ts). */
export async function brandProdukte(brandId: string, limit = 12): Promise<ProduktListItem[]> {
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
     WHERE p.brand_id = $1
       AND p.aktiv = true
       AND p.lagerbestand > 0
       AND p.verkauft = false
       AND p.veroeffentlicht_am IS NOT NULL
       AND p.b2c_mode != 'hidden'
     ORDER BY p.featured DESC, p.veroeffentlicht_am DESC
     LIMIT $2`,
    [brandId, Math.min(48, Math.max(1, limit))],
  );
  return r.rows;
}

/** Veröffentlichte Journal-Posts der Marke. */
export async function brandJournal(brandId: string, limit = 12): Promise<JournalPost[]> {
  const r = await query<JournalPost>(
    `SELECT * FROM sebo.journal_posts
      WHERE brand_id = $1
        AND veroeffentlicht = true
        AND veroeffentlicht_am <= now()
      ORDER BY veroeffentlicht_am DESC
      LIMIT $2`,
    [brandId, Math.min(48, Math.max(1, limit))],
  );
  return r.rows;
}

/** Aktive Instagram-Posts der Marke (Stil wie instagramPostsPublic). */
export async function brandInstagram(brandId: string, limit = 24): Promise<InstagramPost[]> {
  const r = await query<InstagramPost>(
    `SELECT p.id, p.permalink, p.shortcode, p.typ, p.kategorie_id, p.produkt_id,
            p.titel, p.sortierung, p.aktiv, p.erstellt_am,
            k.name AS kategorie_name, k.slug AS kategorie_slug,
            pr.slug AS produkt_slug, pr.name AS produkt_name,
            pr.hauptbild_url AS produkt_bild_url, p.thumbnail_url
       FROM sebo.instagram_posts p
       LEFT JOIN sebo.instagram_kategorien k ON k.id = p.kategorie_id
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
      WHERE p.brand_id = $1 AND p.aktiv = true
      ORDER BY p.sortierung, p.erstellt_am DESC
      LIMIT $2`,
    [brandId, Math.min(48, Math.max(1, limit))],
  );
  return r.rows;
}
