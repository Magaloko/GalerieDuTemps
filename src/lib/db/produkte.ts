import { query } from "./index";
import { generateSlug, uniqueSlug } from "@/lib/utils/slug";
import { dateienFuerProdukt, zertifikateFuerProdukt } from "./produkt-medien";
import { revalidatePublicCatalogCache } from "@/lib/cache/public-catalog";
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
  /** Status-Filter (Admin): aktiv | entwurf | verkauft | reserviert. */
  status?:      "aktiv" | "entwurf" | "verkauft" | "reserviert";
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

  // Status-Filter (Admin) — abgeleitete Zustände, kein eigener Enum.
  if (params.status === "aktiv") {
    conditions.push(`p.aktiv = true AND p.verkauft = false`);
  } else if (params.status === "entwurf") {
    conditions.push(`p.aktiv = false AND p.verkauft = false`);
  } else if (params.status === "verkauft") {
    conditions.push(`p.verkauft = true`);
  } else if (params.status === "reserviert") {
    conditions.push(`p.reserviert_bis IS NOT NULL AND p.reserviert_bis > now() AND p.verkauft = false`);
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
       p.id, p.name, p.slug, p.artikel_code, p.preis, p.originalpreis, p.waehrung,
       k.name AS kategorie_name,
       p.zustand, p.lagerbestand, p.verkauft, p.featured, p.aktiv, p.b2c_mode,
       p.erstellt_am, p.reserviert_bis,
       (p.reserviert_bis IS NOT NULL AND p.reserviert_bis > now() AND p.verkauft = false) AS reserviert,
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
// Entwürfe-Review-Queue: alle Draft-Produkte (aktiv=false, hidden, nicht verkauft)
// Sammelpunkt für Bulk-Upload + Telegram-Foto-Drafts.
// ---------------------------------------------------------------------------
export interface EntwurfRow {
  id:             string;
  name:           string;
  beschreibung:   string | null;
  preis:          number;
  waehrung:       string;
  kategorie_id:   number | null;
  kategorie_name: string | null;
  zustand:        string;
  hauptbild_url:  string | null;
  erstellt_am:    string;
}

export async function entwuerfeListe(limit = 100): Promise<EntwurfRow[]> {
  const r = await query<EntwurfRow>(
    `SELECT p.id, p.name, p.beschreibung, p.preis, p.waehrung,
            p.kategorie_id, k.name AS kategorie_name, p.zustand,
            COALESCE(p.hauptbild_url,
              (SELECT pb.url FROM sebo.produktbilder pb
               WHERE pb.produkt_id = p.id ORDER BY pb.ist_hauptbild DESC, pb.sortierung LIMIT 1)
            ) AS hauptbild_url,
            p.erstellt_am
       FROM sebo.produkte p
       LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
      WHERE p.aktiv = false AND p.verkauft = false AND p.b2c_mode = 'hidden'
      ORDER BY p.erstellt_am DESC
      LIMIT $1`,
    [limit],
  );
  return r.rows;
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
// Entwurf (Draft) anlegen — für den Foto-first-Anlege-Flow
//
// Legt sofort einen versteckten Draft an (aktiv=false, b2c_mode='hidden'), damit
// der normale Editor inkl. Foto-Galerie direkt mit einer echten produkt_id
// arbeiten kann (Fotos beim Anlegen statt erst nach dem Speichern).
// Räumt vorher verwaiste leere Drafts auf (> 1 Tag, ohne Foto) — kein Müll.
// ---------------------------------------------------------------------------
const ENTWURF_NAME = "Новый товар (черновик)";

export async function produktEntwurfErstellen(): Promise<string> {
  // Aufräumen: alte leere Drafts ohne Foto (best-effort, blockiert nie).
  await query(
    `DELETE FROM sebo.produkte p
      WHERE p.name = $1
        AND p.aktiv = false
        AND p.verkauft = false
        AND p.erstellt_am < now() - interval '1 day'
        AND NOT EXISTS (SELECT 1 FROM sebo.produktbilder pb WHERE pb.produkt_id = p.id)`,
    [ENTWURF_NAME],
  ).catch(() => {});

  const slug = uniqueSlug("entwurf");
  // veroeffentlicht_am wird gesetzt → Sichtbarkeit hängt dann NUR an aktiv +
  // b2c_mode (Draft ist hidden+inaktiv = unsichtbar, bis der Admin publiziert).
  const r = await query<{ id: string }>(
    `INSERT INTO sebo.produkte
       (name, slug, preis, lagerbestand, zustand, aktiv, b2c_mode, verkauft, waehrung, veroeffentlicht_am)
     VALUES ($1, $2, 0, 1, 'gut', false, 'hidden', false, 'KZT', now())
     RETURNING id`,
    [ENTWURF_NAME, slug],
  );
  return r.rows[0].id;
}

// ---------------------------------------------------------------------------
// Produkt erstellen
// ---------------------------------------------------------------------------
export async function produktErstellen(
  input: ProduktCreateInput,
  benutzer_id?: string
): Promise<Produkt> {
  // Slug generieren (auto wenn leer)
  let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  const existing = await query(
    `SELECT 1 FROM sebo.produkte WHERE slug = $1`,
    [slug]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    slug = uniqueSlug(input.name);
  }

  // Artikel-Code automatisch generieren wenn nicht gesetzt (V-0001, V-0002, …).
  // Falls die DB-Funktion noch nicht migriert ist (alte DB ohne 021), bleibt null.
  let artikelCode = input.artikel_code?.trim() || null;
  if (!artikelCode) {
    try {
      const seq = await query<{ code: string }>(`SELECT sebo.next_artikel_code() AS code`);
      artikelCode = seq.rows[0]?.code ?? null;
      // Falls aus irgendeinem Grund kollidiert: einmal neu ziehen
      if (artikelCode) {
        const dup = await query(`SELECT 1 FROM sebo.produkte WHERE artikel_code = $1`, [artikelCode]);
        if ((dup.rowCount ?? 0) > 0) {
          const seq2 = await query<{ code: string }>(`SELECT sebo.next_artikel_code() AS code`);
          artikelCode = seq2.rows[0]?.code ?? null;
        }
      }
    } catch (err) {
      console.warn("[artikel_code-Auto] Sequence nicht verfügbar — bleibt null. Migration 021 noch nicht eingespielt?", err);
    }
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
        instagram_urls,
        veroeffentlicht_am)
     VALUES
       ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
        $24,$25,$26,$27::jsonb,
        $28::jsonb, $29::jsonb, $30::jsonb,
        $31,
        now())
     RETURNING id`,
    [
      input.name,
      slug,
      artikelCode,
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
      // Postgres TEXT[]-Literal — Werte in doppelte Quotes für safety
      `{${(input.instagram_urls ?? []).map(u => `"${u.replace(/"/g, '\\"')}"`).join(",")}}`,
    ]
  );

  void benutzer_id; // für spätere Audit-Logs
  revalidatePublicCatalogCache();
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

  if (input.instagram_urls !== undefined) {
    const urls = Array.isArray(input.instagram_urls) ? input.instagram_urls : [];
    felder.push(`instagram_urls = $${idx++}`);
    werte.push(`{${urls.map(u => `"${u.replace(/"/g, '\\"')}"`).join(",")}}`);
  }

  if (input.inhalt_blocks !== undefined) {
    felder.push(`inhalt_blocks = $${idx++}::jsonb`);
    werte.push(JSON.stringify(Array.isArray(input.inhalt_blocks) ? input.inhalt_blocks : []));
  }

  if (felder.length === 0) return produktById(id);

  werte.push(id);
  await query(
    `UPDATE sebo.produkte SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );

  revalidatePublicCatalogCache();
  return produktById(id);
}

// ---------------------------------------------------------------------------
// Reservierung (manuell, durch Kurator/Admin)
// ---------------------------------------------------------------------------

/**
 * Reserviert ein Stück für `stunden` (Default 48h). Atomar + race-safe:
 * Setzt reserviert_bis NUR, wenn das Stück nicht verkauft und nicht bereits
 * aktiv reserviert ist (abgelaufene Reservierung gilt als frei). Gibt false
 * zurück, wenn das Stück nicht (mehr) reservierbar war.
 */
export async function produktReservieren(
  id:      string,
  stunden = 48,
  fuer?:   string | null,
): Promise<boolean> {
  const r = await query(
    `UPDATE sebo.produkte
        SET reserviert_bis = now() + make_interval(hours => $2::int),
            reserviert_von = $3,
            reservierung_erinnert_am = NULL
      WHERE id = $1
        AND verkauft = false
        AND (reserviert_bis IS NULL OR reserviert_bis < now())
      RETURNING id`,
    [id, stunden, fuer ?? null],
  );
  const ok = (r.rowCount ?? 0) > 0;
  if (ok) revalidatePublicCatalogCache();
  return ok;
}

/** Hebt eine Reservierung auf (Stück wieder verfügbar). */
export async function produktReservierungAufheben(id: string): Promise<void> {
  await query(
    `UPDATE sebo.produkte SET reserviert_bis = NULL, reserviert_von = NULL WHERE id = $1`,
    [id],
  );
  revalidatePublicCatalogCache();
}

/** Reservierungen, die innerhalb des Fensters (Default 12h) auslaufen — für die
 *  Ablauf-Erinnerung an den Kurator. Nur aktive (Frist in der Zukunft, nicht
 *  verkauft). `stunden_rest` = Stunden bis zum Ablauf (aufgerundet). */
export interface ReservierungBaldFaellig {
  id:             string;
  name:           string;
  slug:           string;
  reserviert_bis: string;
  reserviert_von: string | null;
  stunden_rest:   number;
}

export async function reservierungenBaldFaellig(
  fensterStunden = 12,
): Promise<ReservierungBaldFaellig[]> {
  const r = await query<ReservierungBaldFaellig>(
    `SELECT
       id, name, slug, reserviert_bis, reserviert_von,
       CEIL(EXTRACT(EPOCH FROM (reserviert_bis - now())) / 3600.0)::int AS stunden_rest
     FROM sebo.produkte
     WHERE verkauft = false
       AND reserviert_bis IS NOT NULL
       AND reserviert_bis > now()
       AND reserviert_bis <= now() + make_interval(hours => $1::int)
       AND reservierung_erinnert_am IS NULL
     ORDER BY reserviert_bis ASC`,
    [fensterStunden],
  );
  return r.rows;
}

/** Markiert Reservierungen als „erinnert" — verhindert Doppel-Benachrichtigung. */
export async function reservierungenErinnertMarkieren(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await query(
    `UPDATE sebo.produkte SET reservierung_erinnert_am = now() WHERE id = ANY($1::uuid[])`,
    [ids],
  );
}

/** Alle aktiven Reservierungen (für die Admin-Übersicht). Mit Hauptbild +
 *  Reststunden bis Ablauf (kann negativ wirken, ist aber > now() gefiltert). */
export interface AktiveReservierung {
  id:             string;
  name:           string;
  slug:           string;
  preis:          number;
  waehrung:       string;
  hauptbild_url:  string | null;
  reserviert_bis: string;
  reserviert_von: string | null;
  stunden_rest:   number;
}

export async function aktiveReservierungen(): Promise<AktiveReservierung[]> {
  const r = await query<AktiveReservierung>(
    `SELECT
       p.id, p.name, p.slug, p.preis, p.waehrung,
       p.reserviert_bis, p.reserviert_von,
       CEIL(EXTRACT(EPOCH FROM (p.reserviert_bis - now())) / 3600.0)::int AS stunden_rest,
       COALESCE(
         p.hauptbild_url,
         (SELECT COALESCE(pb.url_medium, pb.url) FROM sebo.produktbilder pb
           WHERE pb.produkt_id = p.id
           ORDER BY pb.ist_hauptbild DESC, pb.sortierung, pb.erstellt_am LIMIT 1)
       ) AS hauptbild_url
     FROM sebo.produkte p
     WHERE p.verkauft = false
       AND p.reserviert_bis IS NOT NULL
       AND p.reserviert_bis > now()
     ORDER BY p.reserviert_bis ASC`,
  );
  return r.rows;
}

/** Verlängert eine AKTIVE Reservierung (Uhr neu auf now()+stunden) und setzt die
 *  Erinnerung zurück. Greift nur, wenn aktuell aktiv reserviert & nicht verkauft. */
export async function produktReservierungVerlaengern(
  id:      string,
  stunden = 48,
): Promise<boolean> {
  const r = await query(
    `UPDATE sebo.produkte
        SET reserviert_bis = now() + make_interval(hours => $2::int),
            reservierung_erinnert_am = NULL
      WHERE id = $1
        AND verkauft = false
        AND reserviert_bis IS NOT NULL
        AND reserviert_bis > now()
      RETURNING id`,
    [id, stunden],
  );
  const ok = (r.rowCount ?? 0) > 0;
  if (ok) revalidatePublicCatalogCache();
  return ok;
}

// ---------------------------------------------------------------------------
// Produkt löschen
// ---------------------------------------------------------------------------
export async function produktLoeschen(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM sebo.produkte WHERE id = $1`,
    [id]
  );
  if ((result.rowCount ?? 0) > 0) revalidatePublicCatalogCache();
  return (result.rowCount ?? 0) > 0;
}
