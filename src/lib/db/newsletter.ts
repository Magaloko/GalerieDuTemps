import { query } from "./index";
import { randomBytes } from "crypto";
import type { Newsletter, NewsletterStatus, NewsletterSubscriber } from "@/types/newsletter";

// ===========================================================================
// SUBSCRIBERS
// ===========================================================================
export async function subscribePrepare(data: {
  email:        string;
  vorname?:     string;
  customer_id?: string;
  quelle?:      string;
}): Promise<{ token: string; created: boolean }> {
  const token = randomBytes(24).toString("hex");

  // Upsert: bei bestehender E-Mail token erneuern (Re-Subscribe nach Unsubscribe möglich)
  const r = await query<{ created: boolean }>(
    `INSERT INTO sebo.newsletter_subscribers
       (email, vorname, customer_id, confirm_token, confirm_expires, quelle, unsubscribed_am)
     VALUES ($1, $2, $3, $4, now() + interval '48 hours', $5, NULL)
     ON CONFLICT (email) DO UPDATE SET
       confirm_token       = EXCLUDED.confirm_token,
       confirm_expires     = EXCLUDED.confirm_expires,
       unsubscribed_am     = NULL,
       unsubscribe_grund   = NULL,
       vorname             = COALESCE(EXCLUDED.vorname, sebo.newsletter_subscribers.vorname),
       customer_id         = COALESCE(EXCLUDED.customer_id, sebo.newsletter_subscribers.customer_id)
     RETURNING (xmax = 0) AS created`,
    [data.email.toLowerCase(), data.vorname ?? null, data.customer_id ?? null, token, data.quelle ?? "website"]
  );
  return { token, created: r.rows[0]?.created ?? false };
}

export async function subscribeConfirm(token: string): Promise<NewsletterSubscriber | null> {
  const r = await query<NewsletterSubscriber>(
    `UPDATE sebo.newsletter_subscribers
     SET confirmed_am = now(), confirm_token = NULL, confirm_expires = NULL
     WHERE confirm_token = $1 AND confirm_expires > now()
     RETURNING *`,
    [token]
  );
  return r.rows[0] ?? null;
}

export async function unsubscribeByToken(token: string, grund?: string): Promise<boolean> {
  const r = await query(
    `UPDATE sebo.newsletter_subscribers
     SET unsubscribed_am = now(), unsubscribe_grund = $1
     WHERE unsubscribe_token = $2 AND unsubscribed_am IS NULL`,
    [grund ?? "Per 1-Klick-Link", token]
  );
  return (r.rowCount ?? 0) > 0;
}

export async function subscriberByToken(token: string): Promise<NewsletterSubscriber | null> {
  const r = await query<NewsletterSubscriber>(
    `SELECT * FROM sebo.newsletter_subscribers WHERE unsubscribe_token = $1`,
    [token]
  );
  return r.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Admin: Subscriber-Liste
// ---------------------------------------------------------------------------
export interface PaginierteSubscribers {
  items:  NewsletterSubscriber[];
  gesamt: number;
  aktive: number;
}

export async function alleSubscribers(params: { suche?: string; nur_aktive?: boolean } = {}): Promise<PaginierteSubscribers> {
  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.nur_aktive) {
    conds.push(`confirmed_am IS NOT NULL AND unsubscribed_am IS NULL`);
  }
  if (params.suche) {
    conds.push(`email ILIKE $${idx++}`);
    vals.push(`%${params.suche}%`);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [c, d, a] = await Promise.all([
    query<{ gesamt: number }>(`SELECT COUNT(*)::int AS gesamt FROM sebo.newsletter_subscribers ${where}`, vals),
    query<NewsletterSubscriber>(
      `SELECT * FROM sebo.newsletter_subscribers ${where} ORDER BY erstellt_am DESC LIMIT 500`,
      vals
    ),
    query<{ aktive: number }>(
      `SELECT COUNT(*)::int AS aktive FROM sebo.newsletter_subscribers
       WHERE confirmed_am IS NOT NULL AND unsubscribed_am IS NULL`
    ),
  ]);

  return {
    items:  d.rows,
    gesamt: c.rows[0]?.gesamt ?? 0,
    aktive: a.rows[0]?.aktive ?? 0,
  };
}

export async function subscriberLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.newsletter_subscribers WHERE id = $1`, [id]);
}

// ===========================================================================
// NEWSLETTERS
// ===========================================================================
export async function alleNewsletters(): Promise<Newsletter[]> {
  const r = await query<Newsletter>(
    `SELECT * FROM sebo.newsletters ORDER BY erstellt_am DESC LIMIT 100`
  );
  return r.rows;
}

export async function newsletterById(id: string): Promise<Newsletter | null> {
  const r = await query<Newsletter>(`SELECT * FROM sebo.newsletters WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function newsletterErstellen(data: { titel: string; betreff: string; erstellt_von?: string }): Promise<Newsletter> {
  const r = await query<Newsletter>(
    `INSERT INTO sebo.newsletters (titel, betreff, erstellt_von) VALUES ($1, $2, $3) RETURNING *`,
    [data.titel, data.betreff, data.erstellt_von ?? null]
  );
  return r.rows[0];
}

export async function newsletterAktualisieren(id: string, data: {
  titel?:       string;
  betreff?:     string;
  preheader?:   string;
  blocks?:      unknown;
  segment_id?:  string | null;
  status?:      NewsletterStatus;
}): Promise<void> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (key === "blocks") {
        felder.push(`blocks = $${idx++}::jsonb`);
        werte.push(JSON.stringify(value));
      } else {
        felder.push(`${key} = $${idx++}`);
        werte.push(value);
      }
    }
  }
  if (felder.length === 0) return;

  werte.push(id);
  await query(`UPDATE sebo.newsletters SET ${felder.join(", ")} WHERE id = $${idx}`, werte);
}

export async function newsletterLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.newsletters WHERE id = $1`, [id]);
}

// ---------------------------------------------------------------------------
// Versand-Logik (sammelt Empfänger + Mailing-Run)
// ---------------------------------------------------------------------------
export interface VersandKandidat {
  email:         string;
  vorname:       string | null;
  unsubscribe_token: string;
  subscriber_id: string | null;
  customer_id:   string | null;
}

export async function newsletterEmpfaengerSammeln(segmentId?: string): Promise<VersandKandidat[]> {
  if (segmentId) {
    // Segment-Customer + alle bestätigten Subscribers, die NICHT in dnc sind
    // (Newsletter erlaubt Customer + Anonyme Subscribers)
    // Vereinfachung: wir nehmen aktive Subscribers UND Customers im Segment
    const r = await query<VersandKandidat>(
      `(SELECT s.email, s.vorname, s.unsubscribe_token, s.id AS subscriber_id, s.customer_id
        FROM sebo.newsletter_subscribers s
        WHERE s.confirmed_am IS NOT NULL AND s.unsubscribed_am IS NULL)
       UNION
       (SELECT c.email, c.vorname, COALESCE(s.unsubscribe_token, c.dnc_token), s.id AS subscriber_id, c.id AS customer_id
        FROM sebo.customers c
        LEFT JOIN sebo.newsletter_subscribers s ON s.email = c.email
        WHERE c.newsletter_aktiv = true AND c.dnc_aktiv = false)`
    );
    return r.rows;
  }

  // Default: alle bestätigten Newsletter-Subscribers
  const r = await query<VersandKandidat>(
    `SELECT email, vorname, unsubscribe_token, id AS subscriber_id, customer_id
     FROM sebo.newsletter_subscribers
     WHERE confirmed_am IS NOT NULL AND unsubscribed_am IS NULL`
  );
  return r.rows;
}

export async function newsletterSendBuchen(data: {
  newsletter_id: string;
  email:         string;
  subscriber_id?: string;
  customer_id?:   string;
}): Promise<void> {
  await query(
    `INSERT INTO sebo.newsletter_sends (newsletter_id, email, subscriber_id, customer_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (newsletter_id, email) DO NOTHING`,
    [data.newsletter_id, data.email.toLowerCase(), data.subscriber_id ?? null, data.customer_id ?? null]
  );
}

export async function newsletterAlsVersendetMarkieren(id: string, empfaengerAnzahl: number): Promise<void> {
  await query(
    `UPDATE sebo.newsletters
     SET status = 'versendet', versendet_am = now(), empfaenger_anzahl = $1
     WHERE id = $2`,
    [empfaengerAnzahl, id]
  );
}
