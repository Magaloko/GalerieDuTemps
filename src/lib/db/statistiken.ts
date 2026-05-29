import { query } from "./index";

// ---------------------------------------------------------------------------
// Übersichts-Statistiken (Dashboard)
// ---------------------------------------------------------------------------
export interface UebersichtStats {
  produkte_gesamt:        number;
  produkte_verfuegbar:    number;
  produkte_verkauft:      number;
  produkte_featured:      number;
  produkte_niedrig:       number;
  kategorien:             number;
  kontakt_neu:            number;
  kontakt_gesamt:         number;
  wunschliste_eintraege:  number;
  wunschliste_user:       number;
  durchschnittspreis:     number;
  gesamtwert:             number;
  bestellungen_pending:   number;
  bestellungen_paid:      number;
  bestellungen_fulfilled: number;
  bestellungen_heute_versandt: number;
  umsatz_gesamt_cents:    number;
  umsatz_heute_cents:     number;
  umsatz_30tage_cents:    number;
}

export async function uebersichtStats(): Promise<UebersichtStats> {
  const result = await query<UebersichtStats>(`
    SELECT
      (SELECT COUNT(*)::int FROM sebo.produkte)                                          AS produkte_gesamt,
      (SELECT COUNT(*)::int FROM sebo.produkte WHERE lagerbestand > 0 AND verkauft = false) AS produkte_verfuegbar,
      (SELECT COUNT(*)::int FROM sebo.produkte WHERE verkauft = true)                    AS produkte_verkauft,
      (SELECT COUNT(*)::int FROM sebo.produkte WHERE featured = true)                    AS produkte_featured,
      (SELECT COUNT(*)::int FROM sebo.produkte
         WHERE lagerbestand BETWEEN 1 AND 5 AND verkauft = false)                        AS produkte_niedrig,
      (SELECT COUNT(*)::int FROM sebo.kategorien WHERE aktiv = true)                     AS kategorien,
      (SELECT COUNT(*)::int FROM sebo.kontaktanfragen WHERE status = 'neu')              AS kontakt_neu,
      (SELECT COUNT(*)::int FROM sebo.kontaktanfragen)                                   AS kontakt_gesamt,
      (SELECT COUNT(*)::int FROM sebo.wunschliste)                                       AS wunschliste_eintraege,
      (SELECT COUNT(DISTINCT session_token)::int FROM sebo.wunschliste)                  AS wunschliste_user,
      (SELECT COALESCE(AVG(preis), 0)::float FROM sebo.produkte WHERE verkauft = false)  AS durchschnittspreis,
      (SELECT COALESCE(SUM(preis), 0)::float FROM sebo.produkte WHERE verkauft = false)  AS gesamtwert,
      (SELECT COUNT(*)::int FROM sebo.orders WHERE status = 'pending')                   AS bestellungen_pending,
      (SELECT COUNT(*)::int FROM sebo.orders WHERE status = 'paid')                      AS bestellungen_paid,
      (SELECT COUNT(*)::int FROM sebo.orders WHERE status = 'fulfilled')                 AS bestellungen_fulfilled,
      (SELECT COUNT(*)::int FROM sebo.orders
         WHERE versendet_am >= CURRENT_DATE AND versendet_am < CURRENT_DATE + INTERVAL '1 day') AS bestellungen_heute_versandt,
      (SELECT COALESCE(SUM(total_cents), 0)::bigint FROM sebo.orders
         WHERE status IN ('paid','fulfilled','completed'))                               AS umsatz_gesamt_cents,
      (SELECT COALESCE(SUM(total_cents), 0)::bigint FROM sebo.orders
         WHERE status IN ('paid','fulfilled','completed')
           AND bezahlt_am >= CURRENT_DATE AND bezahlt_am < CURRENT_DATE + INTERVAL '1 day') AS umsatz_heute_cents,
      (SELECT COALESCE(SUM(total_cents), 0)::bigint FROM sebo.orders
         WHERE status IN ('paid','fulfilled','completed')
           AND bezahlt_am >= now() - interval '30 days')                                 AS umsatz_30tage_cents
  `);
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Letzte Bestellungen für Dashboard-Widget
// ---------------------------------------------------------------------------
export interface DashboardOrder {
  id:             string;
  order_number:   number;
  customer_name:  string | null;
  customer_email: string;
  total_cents:    number;
  status:         string;
  erstellt_am:    string;
}

export async function letzteOrders(limit = 5): Promise<DashboardOrder[]> {
  const result = await query<DashboardOrder>(
    `SELECT id, order_number, customer_name, customer_email,
            total_cents, status, erstellt_am
     FROM sebo.orders
     ORDER BY erstellt_am DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Produkte mit niedrigem Bestand (1-5) für Dashboard-Widget
// ---------------------------------------------------------------------------
export interface NiedrigBestandProdukt {
  id:           string;
  name:         string;
  slug:         string;
  lagerbestand: number;
  preis:        number;
}

export async function niedrigBestand(limit = 5): Promise<NiedrigBestandProdukt[]> {
  const result = await query<NiedrigBestandProdukt>(
    `SELECT id, name, slug, lagerbestand, preis
     FROM sebo.produkte
     WHERE lagerbestand BETWEEN 1 AND 5 AND verkauft = false AND aktiv = true
     ORDER BY lagerbestand ASC, name ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Produkt-Timeline (letzte 30 Tage)
// ---------------------------------------------------------------------------
export interface TimelineEintrag {
  datum:  string;
  anzahl: number;
}

export async function produktTimeline(tage = 30): Promise<TimelineEintrag[]> {
  // generate_series statt RECURSIVE CTE — vermeidet date+interval-Typmismatch
  const result = await query<TimelineEintrag>(
    `
    SELECT
      to_char(d.datum, 'YYYY-MM-DD') AS datum,
      COUNT(p.id)::int               AS anzahl
    FROM generate_series(
           CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
           CURRENT_DATE,
           INTERVAL '1 day'
         ) AS d(datum)
    LEFT JOIN sebo.produkte p ON DATE(p.erstellt_am) = d.datum::date
    GROUP BY d.datum
    ORDER BY d.datum
    `,
    [tage]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Verteilung nach Kategorien
// ---------------------------------------------------------------------------
export interface KategorieVerteilung {
  name:    string;
  anzahl:  number;
  wert:    number;   // Summe der Preise
}

export async function kategorieVerteilung(): Promise<KategorieVerteilung[]> {
  const result = await query<KategorieVerteilung>(
    `SELECT
       COALESCE(k.name, 'Ohne Kategorie') AS name,
       COUNT(p.id)::int                   AS anzahl,
       COALESCE(SUM(p.preis), 0)::float   AS wert
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE p.verkauft = false
     GROUP BY k.name
     ORDER BY anzahl DESC`
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Verteilung nach Zustand
// ---------------------------------------------------------------------------
export interface ZustandVerteilung {
  zustand: string;
  anzahl:  number;
}

export async function zustandVerteilung(): Promise<ZustandVerteilung[]> {
  const result = await query<ZustandVerteilung>(
    `SELECT zustand, COUNT(*)::int AS anzahl
     FROM sebo.produkte
     WHERE verkauft = false
     GROUP BY zustand
     ORDER BY anzahl DESC`
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Preisanalyse: Histogramm (Buckets)
// ---------------------------------------------------------------------------
export interface PreisBucket {
  von:    number;
  bis:    number;
  label:  string;
  anzahl: number;
}

export async function preisHistogramm(): Promise<PreisBucket[]> {
  // Min/Max für sinnvolle Buckets
  const range = await query<{ min: number; max: number }>(
    `SELECT MIN(preis)::float AS min, MAX(preis)::float AS max
     FROM sebo.produkte WHERE verkauft = false`
  );
  const min = range.rows[0]?.min ?? 0;
  const max = range.rows[0]?.max ?? 1000;

  // 8 Buckets
  const bucketSize = Math.ceil((max - min) / 8) || 100;

  const result = await query<{ bucket: number; anzahl: number }>(
    `SELECT
       FLOOR((preis - $1) / $2)::int AS bucket,
       COUNT(*)::int                  AS anzahl
     FROM sebo.produkte
     WHERE verkauft = false
     GROUP BY bucket
     ORDER BY bucket`,
    [min, bucketSize]
  );

  return result.rows.map(r => {
    const von = min + r.bucket * bucketSize;
    const bis = von + bucketSize;
    return {
      von,
      bis,
      label:  `${Math.round(von)}–${Math.round(bis)} ₸`,
      anzahl: r.anzahl,
    };
  });
}

// ---------------------------------------------------------------------------
// Preisstatistik pro Kategorie
// ---------------------------------------------------------------------------
export interface PreisStatKategorie {
  kategorie:           string;
  anzahl:              number;
  min:                 number;
  max:                 number;
  durchschnitt:        number;
  median:              number;
}

export async function preisStatistikPerKategorie(): Promise<PreisStatKategorie[]> {
  const result = await query<PreisStatKategorie>(
    `SELECT
       COALESCE(k.name, 'Ohne Kategorie')                 AS kategorie,
       COUNT(p.id)::int                                   AS anzahl,
       MIN(p.preis)::float                                AS min,
       MAX(p.preis)::float                                AS max,
       AVG(p.preis)::float                                AS durchschnitt,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.preis)::float AS median
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE p.verkauft = false
     GROUP BY k.name
     HAVING COUNT(p.id) > 0
     ORDER BY anzahl DESC`
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Top + Flop Produkte (nach Preis)
// ---------------------------------------------------------------------------
export interface TopProdukt {
  id:             string;
  name:           string;
  slug:           string;
  preis:          number;
  kategorie_name: string | null;
}

export async function teuersteProdukte(limit = 5): Promise<TopProdukt[]> {
  const result = await query<TopProdukt>(
    `SELECT p.id, p.name, p.slug, p.preis::float, k.name AS kategorie_name
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE p.verkauft = false
     ORDER BY p.preis DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function guenstigsteProdukte(limit = 5): Promise<TopProdukt[]> {
  const result = await query<TopProdukt>(
    `SELECT p.id, p.name, p.slug, p.preis::float, k.name AS kategorie_name
     FROM sebo.produkte p
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE p.verkauft = false AND p.preis > 0
     ORDER BY p.preis ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Letzte Aktivität: zuletzt hinzugefügte Produkte
// ---------------------------------------------------------------------------
export async function letzteProdukte(limit = 5) {
  const result = await query<{
    id: string; name: string; slug: string; preis: number;
    zustand: string; erstellt_am: string;
  }>(
    `SELECT id, name, slug, preis::float, zustand, erstellt_am
     FROM sebo.produkte
     ORDER BY erstellt_am DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
