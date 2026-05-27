import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Dashboard-v2 Helpers
 *
 * Liefert für die neue /admin-Homepage:
 *   - Tages-Trends (Umsatz heute vs gestern, Orders heute vs gestern)
 *   - 7-Tage- + 30-Tage-Vergleich
 *   - Action-Items (Was muss heute passieren?)
 *   - Activity-Feed (kombinierte Timeline aus Orders/Customers/Leads/Kontakt)
 *
 * Alle Queries via UNION/CTE → 1 round-trip pro Sektion.
 * ────────────────────────────────────────────────────────────────────────── */

// ── Trends ──────────────────────────────────────────────────────────────

export interface UmsatzTrend {
  /** Cents heute */
  heute_cents:        number;
  /** Cents gestern */
  gestern_cents:      number;
  /** Cents diese Woche (letzte 7 Tage rolling) */
  woche_cents:        number;
  /** Cents vorherige 7 Tage */
  vorwoche_cents:     number;
  /** Cents letzte 30 Tage rolling */
  monat_cents:        number;
  /** Cents Tag 31-60 rückwärts */
  vormonat_cents:     number;
  /** Orders heute */
  orders_heute:       number;
  /** Orders gestern */
  orders_gestern:     number;
}

export async function umsatzTrend(): Promise<UmsatzTrend> {
  const r = await query<UmsatzTrend>(`
    WITH paid AS (
      SELECT total_cents, bezahlt_am::date AS d
      FROM sebo.orders
      WHERE status IN ('paid','fulfilled','completed') AND bezahlt_am IS NOT NULL
    )
    SELECT
      COALESCE(SUM(total_cents) FILTER (WHERE d = CURRENT_DATE), 0)::bigint
                                                       AS heute_cents,
      COALESCE(SUM(total_cents) FILTER (WHERE d = CURRENT_DATE - 1), 0)::bigint
                                                       AS gestern_cents,
      COALESCE(SUM(total_cents) FILTER (WHERE d > CURRENT_DATE - 7), 0)::bigint
                                                       AS woche_cents,
      COALESCE(SUM(total_cents) FILTER (WHERE d > CURRENT_DATE - 14 AND d <= CURRENT_DATE - 7), 0)::bigint
                                                       AS vorwoche_cents,
      COALESCE(SUM(total_cents) FILTER (WHERE d > CURRENT_DATE - 30), 0)::bigint
                                                       AS monat_cents,
      COALESCE(SUM(total_cents) FILTER (WHERE d > CURRENT_DATE - 60 AND d <= CURRENT_DATE - 30), 0)::bigint
                                                       AS vormonat_cents,
      COUNT(*) FILTER (WHERE d = CURRENT_DATE)::int     AS orders_heute,
      COUNT(*) FILTER (WHERE d = CURRENT_DATE - 1)::int AS orders_gestern
    FROM paid
  `);
  return r.rows[0];
}

// ── Action-Items: "Was muss heute passieren?" ───────────────────────────

export interface AktionsItem {
  /** Slug für Routing (z.B. 'orders-pending-ship') */
  schluessel: string;
  /** Display-Label */
  label:      string;
  /** Anzahl wartende Items */
  count:      number;
  /** Urgency-Level */
  urgency:    "info" | "warn" | "critical";
  /** Link-Target */
  href:       string;
}

/**
 * Liefert die wichtigsten "TODO heute" Items. Items mit count=0 werden
 * gefiltert. Sortiert nach urgency: critical → warn → info.
 */
export async function aktionsItems(): Promise<AktionsItem[]> {
  const r = await query<{
    pending_orders:     number;
    pending_ship:       number;
    b2b_pending:        number;
    leads_unread:       number;
    kontakt_neu:        number;
    niedrig_bestand:    number;
    kritisch_bestand:   number;
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM sebo.orders
         WHERE status = 'pending')                                     AS pending_orders,
      (SELECT COUNT(*)::int FROM sebo.orders
         WHERE status = 'paid' AND versendet_am IS NULL)               AS pending_ship,
      (SELECT COUNT(*)::int FROM sebo.customers
         WHERE customer_type = 'b2b_pending')                          AS b2b_pending,
      (SELECT COUNT(*)::int FROM sebo.leads
         WHERE gelesen = false)                                        AS leads_unread,
      (SELECT COUNT(*)::int FROM sebo.kontaktanfragen
         WHERE status = 'neu')                                         AS kontakt_neu,
      (SELECT COUNT(*)::int FROM sebo.produkte
         WHERE lagerbestand BETWEEN 1 AND 5 AND verkauft = false)      AS niedrig_bestand,
      (SELECT COUNT(*)::int FROM sebo.produkte
         WHERE lagerbestand = 1 AND verkauft = false)                  AS kritisch_bestand
  `).catch(() => ({ rows: [{
      pending_orders: 0, pending_ship: 0, b2b_pending: 0,
      leads_unread: 0, kontakt_neu: 0, niedrig_bestand: 0, kritisch_bestand: 0,
    }] }));

  const c = r.rows[0];
  const items: AktionsItem[] = [];

  if (c.pending_ship > 0) items.push({
    schluessel: "orders-ship",
    label:      `${c.pending_ship === 1 ? "1 заказ" : `${c.pending_ship} заказов`} ждут отправки`,
    count:      c.pending_ship,
    urgency:    c.pending_ship > 5 ? "critical" : "warn",
    href:       "/admin/bestellungen?status=paid",
  });

  if (c.pending_orders > 0) items.push({
    schluessel: "orders-pending",
    label:      `${c.pending_orders === 1 ? "1 заказ" : `${c.pending_orders} заказов`} ждут оплаты`,
    count:      c.pending_orders,
    urgency:    "info",
    href:       "/admin/bestellungen?status=pending",
  });

  if (c.b2b_pending > 0) items.push({
    schluessel: "b2b",
    label:      `${c.b2b_pending} B2B-${c.b2b_pending === 1 ? "запрос на проверке" : "запросов на проверке"}`,
    count:      c.b2b_pending,
    urgency:    c.b2b_pending > 3 ? "warn" : "info",
    href:       "/admin/b2b",
  });

  if (c.kontakt_neu > 0) items.push({
    schluessel: "kontakt",
    label:      `${c.kontakt_neu} ${c.kontakt_neu === 1 ? "сообщение" : "сообщений"} с сайта`,
    count:      c.kontakt_neu,
    urgency:    c.kontakt_neu > 10 ? "warn" : "info",
    href:       "/admin/kontakt",
  });

  if (c.leads_unread > 0) items.push({
    schluessel: "leads",
    label:      `${c.leads_unread} непрочитанных лидов`,
    count:      c.leads_unread,
    urgency:    "info",
    href:       "/admin/leads",
  });

  if (c.kritisch_bestand > 0) items.push({
    schluessel: "stock-critical",
    label:      `${c.kritisch_bestand} ${c.kritisch_bestand === 1 ? "товар" : "товаров"} последний экземпляр`,
    count:      c.kritisch_bestand,
    urgency:    "critical",
    href:       "/admin/produkte",
  }); else if (c.niedrig_bestand > 0) items.push({
    schluessel: "stock-low",
    label:      `${c.niedrig_bestand} ${c.niedrig_bestand === 1 ? "товар" : "товаров"} с низким остатком`,
    count:      c.niedrig_bestand,
    urgency:    "warn",
    href:       "/admin/produkte",
  });

  // Sortierung: critical > warn > info
  const order = { critical: 0, warn: 1, info: 2 };
  items.sort((a, b) => order[a.urgency] - order[b.urgency]);

  return items;
}

// ── Activity-Feed (kombinierte Timeline) ────────────────────────────────

export type AktivitaetsTyp =
  | "order_created"
  | "order_paid"
  | "order_shipped"
  | "customer_registered"
  | "kontakt_received"
  | "lead_received"
  | "product_added";

export interface AktivitaetsEintrag {
  typ:        AktivitaetsTyp;
  zeitstempel: string;
  titel:      string;
  detail?:    string;
  href?:      string;
  /** Optional: Betrag in Cents (für Order-Events) */
  cents?:     number;
}

/**
 * Kombinierte Timeline der letzten N Stunden.
 * UNION aus Orders/Customers/Kontakt/Leads/Produkte.
 */
export async function aktivitaetsFeed(stunden = 24, limit = 15): Promise<AktivitaetsEintrag[]> {
  const r = await query<{
    typ:        string;
    zeitstempel: string;
    titel:      string;
    detail:     string | null;
    href:       string | null;
    cents:      number | null;
  }>(`
    (
      -- Neue Orders
      SELECT
        'order_created' AS typ,
        erstellt_am     AS zeitstempel,
        ('Заказ #' || LPAD(order_number::text, 4, '0') || ' создан') AS titel,
        COALESCE(customer_name, customer_email) AS detail,
        ('/admin/bestellungen/' || id) AS href,
        total_cents AS cents
      FROM sebo.orders
      WHERE erstellt_am > now() - ($1 || ' hours')::interval
    ) UNION ALL (
      -- Bezahlte Orders
      SELECT
        'order_paid', bezahlt_am,
        ('Заказ #' || LPAD(order_number::text, 4, '0') || ' оплачен'),
        COALESCE(customer_name, customer_email),
        ('/admin/bestellungen/' || id),
        total_cents
      FROM sebo.orders
      WHERE bezahlt_am IS NOT NULL
        AND bezahlt_am > now() - ($1 || ' hours')::interval
        AND bezahlt_am != erstellt_am
    ) UNION ALL (
      -- Versendete Orders
      SELECT
        'order_shipped', versendet_am,
        ('Заказ #' || LPAD(order_number::text, 4, '0') || ' отправлен'),
        COALESCE(customer_name, customer_email),
        ('/admin/bestellungen/' || id),
        total_cents
      FROM sebo.orders
      WHERE versendet_am IS NOT NULL
        AND versendet_am > now() - ($1 || ' hours')::interval
    ) UNION ALL (
      -- Neue Customers
      SELECT
        'customer_registered', erstellt_am,
        ('Новый клиент: ' || COALESCE(vorname || ' ' || COALESCE(nachname,''), email)),
        email,
        ('/admin/kunden/' || id),
        NULL
      FROM sebo.customers
      WHERE erstellt_am > now() - ($1 || ' hours')::interval
    ) UNION ALL (
      -- Kontakt-Anfragen
      SELECT
        'kontakt_received', erstellt_am,
        'Новое сообщение с сайта',
        COALESCE(name, email),
        '/admin/kontakt',
        NULL
      FROM sebo.kontaktanfragen
      WHERE erstellt_am > now() - ($1 || ' hours')::interval
    ) UNION ALL (
      -- Neue Produkte
      SELECT
        'product_added', erstellt_am,
        ('Товар добавлен: ' || name),
        kategorie_id::text,
        ('/admin/produkte/' || id),
        (preis * 100)::bigint
      FROM sebo.produkte
      WHERE erstellt_am > now() - ($1 || ' hours')::interval
    )
    ORDER BY zeitstempel DESC
    LIMIT $2
  `, [String(stunden), limit]).catch(() => ({ rows: [] }));

  return r.rows.map(row => ({
    typ:        row.typ as AktivitaetsTyp,
    zeitstempel: row.zeitstempel,
    titel:      row.titel,
    detail:     row.detail ?? undefined,
    href:       row.href ?? undefined,
    cents:      row.cents ?? undefined,
  }));
}

// ── Trend-Helpers ───────────────────────────────────────────────────────

export interface TrendVergleich {
  current:    number;
  previous:   number;
  /** Differenz absolute */
  delta:      number;
  /** Differenz % (positiv = gewachsen) */
  prozent:    number;
  /** "up" | "down" | "flat" */
  richtung:   "up" | "down" | "flat";
}

export function berechneTrend(current: number, previous: number): TrendVergleich {
  const delta = current - previous;
  const prozent = previous === 0
    ? (current === 0 ? 0 : 100)
    : Math.round((delta / previous) * 100);
  const richtung: TrendVergleich["richtung"] =
    Math.abs(prozent) < 5 ? "flat" : prozent > 0 ? "up" : "down";
  return { current, previous, delta, prozent, richtung };
}
