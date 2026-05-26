import { query } from "./index";

// ===========================================================================
// Types
// ===========================================================================

export type LeadQuelle =
  | "kontaktanfrage"
  | "instagram_dm" | "instagram_comment" | "instagram_mention"
  | "telegram" | "whatsapp" | "mail" | "manuell";

export type LeadStatus =
  | "neu" | "gelesen" | "in_arbeit" | "beantwortet"
  | "qualifiziert" | "verloren" | "archiviert";

export type LeadPrioritaet = "niedrig" | "normal" | "hoch" | "dringend";

export interface Lead {
  id:                 string;
  quelle:             LeadQuelle;
  kanal_konto_id:     number | null;
  externe_id:         string | null;
  kontakt_handle:     string | null;
  kontakt_name:       string | null;
  kontakt_email:      string | null;
  betreff:            string | null;
  vorschau:           string | null;
  customer_id:        string | null;
  produkt_id:         string | null;
  kontaktanfrage_id:  string | null;
  status:             LeadStatus;
  prioritaet:         LeadPrioritaet;
  zugewiesen_an:      string | null;
  tags:               string[];
  erstellt_am:        string;
  aktualisiert_am:    string;
  beantwortet_am:     string | null;
  // joined
  zugewiesen_an_name?: string | null;
  produkt_name?:       string | null;
  customer_email?:     string | null;
}

export interface LeadMessage {
  id:           string;
  lead_id:      string;
  richtung:     "inbound" | "outbound" | "interne_notiz";
  text:         string | null;
  attachments:  Array<{ url: string; mime?: string; dateigroesse?: number }>;
  externe_id:   string | null;
  autor_id:     string | null;
  autor_name?:  string | null;
  gesendet_am:  string;
  gelesen_am:   string | null;
}

export interface LeadsListe {
  items:  Lead[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

export interface LeadKpis {
  alle:           number;
  neu:            number;
  in_arbeit:      number;
  beantwortet:    number;
  meine:          number;
  dringend:       number;
}

// ===========================================================================
// Liste mit Filter + Paginierung
// ===========================================================================

export async function leadsListe(params: {
  quelle?:        LeadQuelle | "alle";
  status?:        LeadStatus | "alle" | "offen";
  zugewiesen_an?: string;     // userId, oder "meine" wird vom Caller resolved
  meine_user_id?: string;     // wenn nur eigene
  prioritaet?:    LeadPrioritaet;
  suche?:         string;
  seite?:         number;
  limit?:         number;
}): Promise<LeadsListe> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 30);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.quelle && params.quelle !== "alle") {
    conds.push(`l.quelle = $${idx++}`);
    vals.push(params.quelle);
  }
  if (params.status === "offen") {
    conds.push(`l.status NOT IN ('archiviert','verloren','beantwortet')`);
  } else if (params.status && params.status !== "alle") {
    conds.push(`l.status = $${idx++}`);
    vals.push(params.status);
  }
  if (params.meine_user_id) {
    conds.push(`l.zugewiesen_an = $${idx++}`);
    vals.push(params.meine_user_id);
  } else if (params.zugewiesen_an) {
    conds.push(`l.zugewiesen_an = $${idx++}`);
    vals.push(params.zugewiesen_an);
  }
  if (params.prioritaet) {
    conds.push(`l.prioritaet = $${idx++}`);
    vals.push(params.prioritaet);
  }
  if (params.suche) {
    conds.push(`(
      l.kontakt_name  ILIKE $${idx} OR
      l.kontakt_email ILIKE $${idx} OR
      l.kontakt_handle ILIKE $${idx} OR
      l.betreff       ILIKE $${idx} OR
      l.vorschau      ILIKE $${idx}
    )`);
    vals.push(`%${params.suche}%`);
    idx++;
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [countRes, dataRes] = await Promise.all([
    query<{ gesamt: number }>(
      `SELECT COUNT(*)::int AS gesamt FROM sebo.leads l ${where}`,
      vals
    ),
    query<Lead>(
      `SELECT
         l.*,
         b.name  AS zugewiesen_an_name,
         p.name  AS produkt_name,
         c.email AS customer_email
       FROM sebo.leads l
       LEFT JOIN sebo.benutzer  b ON b.id = l.zugewiesen_an
       LEFT JOIN sebo.produkte  p ON p.id = l.produkt_id
       LEFT JOIN sebo.customers c ON c.id = l.customer_id
       ${where}
       ORDER BY
         CASE l.status WHEN 'neu' THEN 0 WHEN 'in_arbeit' THEN 1 WHEN 'gelesen' THEN 2 ELSE 3 END,
         CASE l.prioritaet WHEN 'dringend' THEN 0 WHEN 'hoch' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         l.erstellt_am DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = countRes.rows[0]?.gesamt ?? 0;
  return { items: dataRes.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

// ===========================================================================
// KPIs für Dashboard / Inbox-Header
// ===========================================================================

export async function leadKpis(userId?: string): Promise<LeadKpis> {
  const res = await query<LeadKpis>(
    `SELECT
       COUNT(*)::int                                              AS alle,
       COUNT(*) FILTER (WHERE status = 'neu')::int                AS neu,
       COUNT(*) FILTER (WHERE status = 'in_arbeit')::int          AS in_arbeit,
       COUNT(*) FILTER (WHERE status = 'beantwortet')::int        AS beantwortet,
       COUNT(*) FILTER (WHERE prioritaet = 'dringend' AND status NOT IN ('archiviert','verloren'))::int AS dringend,
       COUNT(*) FILTER (WHERE zugewiesen_an = $1 AND status NOT IN ('archiviert','verloren'))::int     AS meine
     FROM sebo.leads`,
    [userId ?? null]
  );
  return res.rows[0] ?? { alle: 0, neu: 0, in_arbeit: 0, beantwortet: 0, meine: 0, dringend: 0 };
}

// ===========================================================================
// Detail
// ===========================================================================

export async function leadById(id: string): Promise<Lead | null> {
  const r = await query<Lead>(
    `SELECT l.*,
            b.name  AS zugewiesen_an_name,
            p.name  AS produkt_name,
            c.email AS customer_email
     FROM sebo.leads l
     LEFT JOIN sebo.benutzer  b ON b.id = l.zugewiesen_an
     LEFT JOIN sebo.produkte  p ON p.id = l.produkt_id
     LEFT JOIN sebo.customers c ON c.id = l.customer_id
     WHERE l.id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function leadMessages(leadId: string): Promise<LeadMessage[]> {
  const r = await query<LeadMessage>(
    `SELECT m.*, b.name AS autor_name
     FROM sebo.lead_messages m
     LEFT JOIN sebo.benutzer b ON b.id = m.autor_id
     WHERE m.lead_id = $1
     ORDER BY m.gesendet_am ASC`,
    [leadId]
  );
  return r.rows;
}

/** Für den Fall quelle='kontaktanfrage': lade die Original-Nachricht (volltext). */
export async function leadOriginalNachricht(leadId: string): Promise<string | null> {
  const r = await query<{ nachricht: string }>(
    `SELECT k.nachricht
     FROM sebo.leads l
     JOIN sebo.kontaktanfragen k ON k.id = l.kontaktanfrage_id
     WHERE l.id = $1`,
    [leadId]
  );
  return r.rows[0]?.nachricht ?? null;
}

// ===========================================================================
// Mutationen
// ===========================================================================

export async function leadStatusAendern(
  id: string,
  status: LeadStatus,
  userId?: string
): Promise<void> {
  const beantwortet = status === "beantwortet" || status === "qualifiziert";
  await query(
    `UPDATE sebo.leads
     SET status = $1,
         beantwortet_am = CASE WHEN $2::bool THEN COALESCE(beantwortet_am, now()) ELSE beantwortet_am END
     WHERE id = $3`,
    [status, beantwortet, id]
  );
  if (userId) {
    await logLeadActivity(id, "status_change", { status }, userId).catch(() => {});
  }
}

export async function leadPrioritaetAendern(
  id: string,
  prioritaet: LeadPrioritaet,
  userId?: string
): Promise<void> {
  await query(`UPDATE sebo.leads SET prioritaet = $1 WHERE id = $2`, [prioritaet, id]);
  if (userId) await logLeadActivity(id, "priority_change", { prioritaet }, userId).catch(() => {});
}

export async function leadZuweisen(
  id: string,
  benutzer_id: string | null,
  userId?: string
): Promise<void> {
  await query(`UPDATE sebo.leads SET zugewiesen_an = $1 WHERE id = $2`, [benutzer_id, id]);
  if (userId) await logLeadActivity(id, "assign", { zugewiesen_an: benutzer_id }, userId).catch(() => {});
}

export async function leadKommentarHinzufuegen(
  lead_id:  string,
  text:     string,
  autor_id: string,
  richtung: "outbound" | "interne_notiz" = "interne_notiz"
): Promise<LeadMessage> {
  const r = await query<LeadMessage>(
    `INSERT INTO sebo.lead_messages (lead_id, richtung, text, autor_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [lead_id, richtung, text, autor_id]
  );
  return r.rows[0];
}

export async function leadKonvertierenZuCustomer(
  lead_id:        string,
  customer_id:    string
): Promise<void> {
  await query(`UPDATE sebo.leads SET customer_id = $1 WHERE id = $2`, [customer_id, lead_id]);
}

// ===========================================================================
// Inbound-Hooks (vorbereitet für Session 2/3)
// ===========================================================================

export interface InboundLeadInput {
  quelle:         LeadQuelle;
  kanal_konto_id?: number;
  externe_id:     string;
  kontakt_handle?: string;
  kontakt_name?:   string;
  kontakt_email?:  string;
  betreff?:        string;
  vorschau?:       string;
  text?:           string;
  produkt_id?:     string;
  raw_payload?:    unknown;
}

/**
 * Idempotenter Insert. Bei Duplikat (selbe quelle+externe_id) wird
 * die existing-id zurückgegeben; sonst neuer Lead.
 */
export async function leadAusKanalErstellen(
  input: InboundLeadInput
): Promise<{ id: string; created: boolean }> {
  const r = await query<{ id: string; was_new: boolean }>(
    `INSERT INTO sebo.leads (
       quelle, kanal_konto_id, externe_id,
       kontakt_handle, kontakt_name, kontakt_email,
       betreff, vorschau, produkt_id, raw_payload
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (quelle, externe_id) DO UPDATE
       SET aktualisiert_am = now()    -- kein-op zur Rückgabe der existing-row
     RETURNING id, (xmax = 0) AS was_new`,
    [
      input.quelle,
      input.kanal_konto_id ?? null,
      input.externe_id,
      input.kontakt_handle ?? null,
      input.kontakt_name   ?? null,
      input.kontakt_email  ?? null,
      input.betreff        ?? null,
      input.vorschau       ?? (input.text ? input.text.slice(0, 240) : null),
      input.produkt_id     ?? null,
      input.raw_payload ? JSON.stringify(input.raw_payload) : null,
    ]
  );
  const row = r.rows[0];
  // Wenn neuer Lead: erste lead_message als inbound speichern
  if (row.was_new && input.text) {
    await query(
      `INSERT INTO sebo.lead_messages (lead_id, richtung, text, externe_id)
       VALUES ($1, 'inbound', $2, $3)`,
      [row.id, input.text, input.externe_id]
    );
  }
  return { id: row.id, created: row.was_new };
}

// ===========================================================================
// Activity-Log (nutzt sebo.crm_events)
// ===========================================================================

export async function logLeadActivity(
  lead_id:  string,
  typ:      string,
  daten:    Record<string, unknown>,
  user_id:  string
): Promise<void> {
  await query(
    `INSERT INTO sebo.crm_events (customer_id, typ, daten, quelle)
     SELECT l.customer_id, $1, $2::jsonb, $3
     FROM sebo.leads l WHERE l.id = $4`,
    [`lead.${typ}`, JSON.stringify({ ...daten, lead_id, user_id }), `user:${user_id}`, lead_id]
  );
}

// ===========================================================================
// Admin-User-Auflistung (für Zuweisen-Select)
// ===========================================================================

export interface AdminBenutzer {
  id:    string;
  name:  string;
  email: string;
  rolle: string;
}

export async function adminBenutzerListe(): Promise<AdminBenutzer[]> {
  const r = await query<AdminBenutzer>(
    `SELECT id, name, email, rolle
     FROM sebo.benutzer
     WHERE aktiv = true
     ORDER BY name, email`
  );
  return r.rows;
}
