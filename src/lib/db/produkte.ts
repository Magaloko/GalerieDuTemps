import { query } from "./index";
import { generateSlug, uniqueSlug } from "@/lib/utils/slug";
import { dateienFuerProdukt, zertifikateFuerProdukt } from "./produkt-medien";
import type {
  Produkt,
  ProduktListItem,
  PaginierteProdukte,
} from "@/types/produkt";
import type { ProduktCreateInput, ProduktUpdateInput } from "@/lib/utils/validierung";

// ---------------------------------------------------------------------------
// Produkt-Liste (Admin) mit Paginierung + Suche
// ---------------------------------------------------------------------------
export async function produkteListe(params: {
  seite?:       number;
  limit?:       number;
  suche?:       string;
  kategorie?:   string;     // slug-based
  kategorie_id?: number;
  zustand?:     string;
  sortierung?:  string;
}): Promise<PaginierteProdukte> {
  const seite  = Math.max(1, params.seite  ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let idx = 1;

  if (params.suche) {
    conditions.push(
      `(p.name ILIKE $${idx} OR p.slug ILIKE $${idx} OR p.artikel_code ILIKE $${idx})`
    );
    queryParams.push(`%${params.suche}%`);
    idx++;
  }

  if (params.kategorie_id) {
    conditions.push(`p.kategorie_id = $${idx++}`);
    queryParams.push(params.kategorie_id);
  }

  if (params.kategorie) {
    conditions.push(`p.kategorie_id = (SELECT id FROM sebo.kategorien WHERE slug = $${idx++})`);
    queryParams.push(params.kategorie);
  }

  if (params.zustand) {
    conditions.push(`p.zustand = $${idx++}`);
    queryParams.push(params.zustand);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderMap: Record<string, string> = {
    erstellt_am: "p.erstellt_am DESC",
    preis_asc:   "p.preis ASC",
    preis_desc:  "p.preis DESC",
    name:        "p.name ASC",
  };
  const orderBy = orderMap[params.sortierung ?? "erstellt_am"] ?? "p.erstellt_am DESC";

  // Gesamtanzahl
  const countResult = await query<{ gesamt: number }>(
    `SELECT COUNT(*)::int AS gesamt FROM sebo.produkte p ${where}`,
    queryParams
  );
  const gesamt = countResult.rows[0]?.gesamt ?? 0;

  // Daten
  const dataResult = await query<ProduktListItem>(
    `SELECT
       p.id, p.name, p.slug, p.artikel_code, p.preis, p.originalpreis,
       k.name AS kategorie_name,
       p.zustand, p.lagerbestand, p.verkauft, p.featured, p.aktiv, p.b2c_mode,
       p.erstellt_am,
       COALESCE(
         p.hauptbild_url,
         (SELECT pb.url FROM sebo.produktbilder pb
          WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true
          LIMIT 1)
       ) AS hauptbild_url
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    items:  dataResult.rows,
    gesamt,
    seite,
    limit,
    seiten: Math.ceil(gesamt / limit),
  };
}

// ---------------------------------------------------------------------------
// Einzelnes Produkt laden (mit Bildern)
// ---------------------------------------------------------------------------
export async function produktById(id: string): Promise<Produkt | null> {
  const result = await query<Produkt>(
    `SELECT
       p.*,
       k.name AS kategorie_name,
       COALESCE(
         json_agg(
           json_build_object(
             'id',            pb.id,
             'url',           pb.url,
             'alt_text',      pb.alt_text,
             'sortierung',    pb.sortierung,
             'ist_hauptbild', pb.ist_hauptbild,
             'dateigroesse',  pb.dateigroesse
           ) ORDER BY pb.sortierung, pb.erstellt_am
         ) FILTER (WHERE pb.id IS NOT NULL),
         '[]'
       ) AS bilder
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     LEFT JOIN sebo.produktbilder pb ON pb.produkt_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, k.name`,
    [id]
  );
  const produkt = result.rows[0];
  if (!produkt) return null;
  const [dateien, zertifikate] = await Promise.all([
    dateienFuerProdukt(id).catch(() => []),
    zertifikateFuerProdukt(id).catch(() => []),
  ]);
  return { ...produkt, dateien, zertifikate };
}

/** Produkt per Slug laden */
export async function produktBySlug(slug: string): Promise<Produkt | null> {
  const result = await query<{ id: string }>(
    `SELECT id FROM sebo.produkte WHERE slug = $1`,
    [slug]
  );
  if (!result.rows[0]) return null;
  return produktById(result.rows[0].id);
}

// ---------------------------------------------------------------------------
// Produkt erstellen
// ---------------------------------------------------------------------------
export async function produktErstellen(
  input: ProduktCreateInput,
  benutzer_id?: string
): Promise<Produkt> {
  // Slug generieren
  let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  // Kollision prüfen
  const existing = await query(
    `SELECT 1 FROM sebo.produkte WHERE slug = $1`,
    [slug]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    slug = uniqueSlug(input.name);
  }

  const tags = Array.isArray(input.tags) ? input.tags : [];

  const result = await query<{ id: string }>(
    `INSERT INTO sebo.produkte
       (name, slug, artikel_code, beschreibung, kurzbeschreibung,
        preis, originalpreis, einkaufspreis, b2b_preis, waehrung,
        kategorie_id, zustand, era, herkunft, material, lagerbestand, featured, verkauft,
        aktiv, b2c_mode, seo_titel, seo_beschreibung, tags,
        hauptbild_url, rueckbild_url, video_url, abmessungen,
        name_i18n, kurzbeschreibung_i18n, beschreibung_i18n,
        veroeffentlicht_am)
     VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
        $24,$25,$26,$27::jsonb,
        $28::jsonb, $29::jsonb, $30::jsonb,
        now())
     RETURNING id`,
    [
      input.name,
      slug,
      input.artikel_code       ?? null,
      input.beschreibung       ?? null,
      input.kurzbeschreibung   ?? null,
      input.preis,
      input.originalpreis      ?? null,
      input.einkaufspreis      ?? null,
      input.b2b_preis          ?? null,
      input.waehrung           ?? "KZT",
      input.kategorie_id       ?? null,
      input.zustand            ?? "gut",
      input.era                ?? null,
      input.herkunft           ?? null,
      input.material           ?? null,
      input.lagerbestand       ?? 1,
      input.featured           ?? false,
      input.verkauft           ?? false,
      input.aktiv              ?? true,
      input.b2c_mode           ?? "visible",
      input.seo_titel          ?? null,
      input.seo_beschreibung   ?? null,
      `{${tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(",")}}`,
      input.hauptbild_url      ?? null,
      input.rueckbild_url      ?? null,
      input.video_url          ?? null,
      input.abmessungen ? JSON.stringify(input.abmessungen) : null,
      JSON.stringify(input.name_i18n             ?? {}),
      JSON.stringify(input.kurzbeschreibung_i18n ?? {}),
      JSON.stringify(input.beschreibung_i18n     ?? {}),
    ]
  );

  void benutzer_id; // für spätere Audit-Logs
  return produktById(result.rows[0].id) as Promise<Produkt>;
}

// ---------------------------------------------------------------------------
// Produkt aktualisieren
// ---------------------------------------------------------------------------
export async function produktAktualisieren(
  id:    string,
  input: ProduktUpdateInput
): Promise<Produkt | null> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  const mappings: Array<[keyof ProduktUpdateInput, string]> = [
    ["name",             "name"],
    ["slug",             "slug"],
    ["artikel_code",     "artikel_code"],
    ["beschreibung",     "beschreibung"],
    ["kurzbeschreibung", "kurzbeschreibung"],
    ["preis",            "preis"],
    ["originalpreis",    "originalpreis"],
    ["einkaufspreis",    "einkaufspreis"],
    ["b2b_preis",        "b2b_preis"],
    ["waehrung",         "waehrung"],
    ["kategorie_id",     "kategorie_id"],
    ["zustand",          "zustand"],
    ["era",              "era"],
    ["herkunft",         "herkunft"],
    ["material",         "material"],
    ["lagerbestand",     "lagerbestand"],
    ["featured",         "featured"],
    ["verkauft",         "verkauft"],
    ["aktiv",            "aktiv"],
    ["b2c_mode",         "b2c_mode"],
    ["seo_titel",        "seo_titel"],
    ["seo_beschreibung", "seo_beschreibung"],
    ["hauptbild_url",    "hauptbild_url"],
    ["rueckbild_url",    "rueckbild_url"],
    ["video_url",        "video_url"],
  ];

  for (const [key, col] of mappings) {
    if (key in input && input[key] !== undefined) {
      felder.push(`${col} = $${idx++}`);
      werte.push(input[key] ?? null);
    }
  }

  if (input.abmessungen !== undefined) {
    felder.push(`abmessungen = $${idx++}::jsonb`);
    werte.push(input.abmessungen ? JSON.stringify(input.abmessungen) : null);
  }

  for (const [key, col] of [
    ["name_i18n", "name_i18n"],
    ["kurzbeschreibung_i18n", "kurzbeschreibung_i18n"],
    ["beschreibung_i18n", "beschreibung_i18n"],
  ] as const) {
    if (key in input && input[key as keyof ProduktUpdateInput] !== undefined) {
      felder.push(`${col} = $${idx++}::jsonb`);
      werte.push(JSON.stringify(input[key as keyof ProduktUpdateInput] ?? {}));
    }
  }

  if (input.tags !== undefined) {
    const tags = Array.isArray(input.tags) ? input.tags : [];
    felder.push(`tags = $${idx++}`);
    werte.push(`{${tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(",")}}`);
  }

  if (felder.length === 0) return produktById(id);

  werte.push(id);
  await query(
    `UPDATE sebo.produkte SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );

  return produktById(id);
}

// ---------------------------------------------------------------------------
// Produkt löschen
// ---------------------------------------------------------------------------
export async function produktLoeschen(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM sebo.produkte WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
