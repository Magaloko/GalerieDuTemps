import { query, withTransaction } from "./index";
import type {
  PipelineStage, Tag, Note, Task,
  Segment, SegmentFilter, DripFlow, DripFlowStep, CrmEvent,
  TaskStatus, TaskPrioritaet,
} from "@/types/crm";

// ===========================================================================
// PIPELINE
// ===========================================================================
export async function alleStages(): Promise<PipelineStage[]> {
  const r = await query<PipelineStage>(
    `SELECT * FROM sebo.pipeline_stages WHERE aktiv = true ORDER BY sortierung`
  );
  return r.rows;
}

export async function stageAktualisieren(customerId: string, stageId: number): Promise<void> {
  await query(
    `UPDATE sebo.customers SET pipeline_stage_id = $1 WHERE id = $2`,
    [stageId, customerId]
  );
}

export interface PipelineEintrag {
  customer_id:    string;
  customer_name:  string;
  customer_email: string;
  customer_type:  string;
  stage_id:       number;
  letzter_login:  string | null;
}

export async function pipelineMitKunden(): Promise<PipelineEintrag[]> {
  const r = await query<PipelineEintrag>(
    `SELECT
       c.id AS customer_id,
       COALESCE(c.vorname || ' ' || c.nachname, c.email) AS customer_name,
       c.email AS customer_email,
       c.customer_type,
       c.pipeline_stage_id AS stage_id,
       c.letzter_login_am AS letzter_login
     FROM sebo.customers c
     WHERE c.pipeline_stage_id IS NOT NULL
     ORDER BY c.aktualisiert_am DESC`
  );
  return r.rows;
}

// ===========================================================================
// TAGS
// ===========================================================================
export async function alleTags(): Promise<Tag[]> {
  const r = await query<Tag>(
    `SELECT t.*, COUNT(ct.customer_id)::int AS anzahl
     FROM sebo.tags t
     LEFT JOIN sebo.customer_tags ct ON ct.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name`
  );
  return r.rows;
}

export async function tagErstellen(data: { name: string; farbe?: string; beschreibung?: string }): Promise<Tag> {
  const r = await query<Tag>(
    `INSERT INTO sebo.tags (name, farbe, beschreibung) VALUES ($1, $2, $3) RETURNING *`,
    [data.name, data.farbe ?? "#C9A84C", data.beschreibung ?? null]
  );
  return r.rows[0];
}

export async function tagLoeschen(id: number): Promise<void> {
  await query(`DELETE FROM sebo.tags WHERE id = $1`, [id]);
}

export async function tagsFuerCustomer(customerId: string): Promise<Tag[]> {
  const r = await query<Tag>(
    `SELECT t.* FROM sebo.tags t
     JOIN sebo.customer_tags ct ON ct.tag_id = t.id
     WHERE ct.customer_id = $1
     ORDER BY t.name`,
    [customerId]
  );
  return r.rows;
}

export async function tagZuweisen(customerId: string, tagId: number, adminId?: string): Promise<void> {
  await query(
    `INSERT INTO sebo.customer_tags (customer_id, tag_id, erstellt_von)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [customerId, tagId, adminId ?? null]
  );
}

export async function tagEntfernen(customerId: string, tagId: number): Promise<void> {
  await query(
    `DELETE FROM sebo.customer_tags WHERE customer_id = $1 AND tag_id = $2`,
    [customerId, tagId]
  );
}

// ===========================================================================
// NOTES
// ===========================================================================
export async function notesFuerCustomer(customerId: string): Promise<Note[]> {
  const r = await query<Note & { erstellt_von_name: string }>(
    `SELECT n.*, b.name AS erstellt_von_name
     FROM sebo.notes n
     LEFT JOIN sebo.benutzer b ON b.id = n.erstellt_von
     WHERE n.customer_id = $1
     ORDER BY n.pinned DESC, n.erstellt_am DESC`,
    [customerId]
  );
  return r.rows;
}

export async function noteErstellen(data: { customer_id: string; inhalt: string; pinned?: boolean; erstellt_von?: string }): Promise<Note> {
  const r = await query<Note>(
    `INSERT INTO sebo.notes (customer_id, inhalt, pinned, erstellt_von)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.customer_id, data.inhalt, data.pinned ?? false, data.erstellt_von ?? null]
  );
  return r.rows[0];
}

export async function notePinnen(id: string, pinned: boolean): Promise<void> {
  await query(`UPDATE sebo.notes SET pinned = $1 WHERE id = $2`, [pinned, id]);
}

export async function noteLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.notes WHERE id = $1`, [id]);
}

// ===========================================================================
// TASKS
// ===========================================================================
export async function tasksListe(params: {
  status?:        TaskStatus | "";
  zugewiesen_an?: string;
  customer_id?:   string;
  limit?:         number;
}): Promise<Task[]> {
  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.status)        { conds.push(`t.status = $${idx++}`);        vals.push(params.status); }
  if (params.zugewiesen_an) { conds.push(`t.zugewiesen_an = $${idx++}`); vals.push(params.zugewiesen_an); }
  if (params.customer_id)   { conds.push(`t.customer_id = $${idx++}`);   vals.push(params.customer_id); }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const limit = params.limit ?? 100;

  const r = await query<Task>(
    `SELECT t.*,
       COALESCE(c.vorname || ' ' || c.nachname, c.email) AS customer_name,
       c.email AS customer_email,
       b.name AS zugewiesen_an_name
     FROM sebo.tasks t
     LEFT JOIN sebo.customers c ON c.id = t.customer_id
     LEFT JOIN sebo.benutzer  b ON b.id = t.zugewiesen_an
     ${where}
     ORDER BY
       CASE t.status WHEN 'offen' THEN 0 WHEN 'in_arbeit' THEN 1 WHEN 'erledigt' THEN 2 ELSE 3 END,
       CASE t.prioritaet WHEN 'dringend' THEN 0 WHEN 'hoch' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
       t.faellig_am NULLS LAST,
       t.erstellt_am DESC
     LIMIT $${vals.length + 1}`,
    [...vals, Math.max(1, Math.min(1000, Number(limit) || 100))]
  );
  return r.rows;
}

export async function taskErstellen(data: {
  titel:           string;
  beschreibung?:   string;
  customer_id?:    string;
  zugewiesen_an?:  string;
  erstellt_von?:   string;
  prioritaet?:     TaskPrioritaet;
  faellig_am?:     string;
}): Promise<Task> {
  const r = await query<Task>(
    `INSERT INTO sebo.tasks (titel, beschreibung, customer_id, zugewiesen_an, erstellt_von, prioritaet, faellig_am)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      data.titel, data.beschreibung ?? null, data.customer_id ?? null,
      data.zugewiesen_an ?? null, data.erstellt_von ?? null,
      data.prioritaet ?? "normal", data.faellig_am ?? null,
    ]
  );
  return r.rows[0];
}

export async function taskStatusAendern(id: string, status: TaskStatus): Promise<void> {
  // erledigt_am: bei "erledigt" jetzt setzen, sonst NULL — alles parameterisiert.
  await query(
    `UPDATE sebo.tasks
     SET status = $1,
         erledigt_am = CASE WHEN $1 = 'erledigt' THEN now() ELSE NULL END
     WHERE id = $2`,
    [status, id]
  );
}

export async function taskLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.tasks WHERE id = $1`, [id]);
}

// ===========================================================================
// SEGMENTS
// ===========================================================================
export async function alleSegments(): Promise<Segment[]> {
  const r = await query<Segment>(`SELECT * FROM sebo.segments ORDER BY erstellt_am DESC`);
  return r.rows;
}

export async function segmentErstellen(data: { name: string; beschreibung?: string; filter: SegmentFilter; erstellt_von?: string }): Promise<Segment> {
  const r = await query<Segment>(
    `INSERT INTO sebo.segments (name, beschreibung, filter, erstellt_von)
     VALUES ($1, $2, $3::jsonb, $4) RETURNING *`,
    [data.name, data.beschreibung ?? null, JSON.stringify(data.filter), data.erstellt_von ?? null]
  );
  return r.rows[0];
}

export async function segmentLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.segments WHERE id = $1`, [id]);
}

/** Live-Vorschau: Customer-IDs gemäß Filter */
export async function segmentVorschau(filter: SegmentFilter, limit = 100): Promise<{
  treffer: number;
  ids:     string[];
}> {
  const conds: string[] = ["c.email_bestaetigt_am IS NOT NULL", "c.dnc_aktiv = false"];
  const vals:  unknown[] = [];
  let idx = 1;

  if (filter.customer_type?.length) {
    conds.push(`c.customer_type = ANY($${idx++}::text[])`);
    vals.push(filter.customer_type);
  }
  if (filter.stage_id) {
    conds.push(`c.pipeline_stage_id = $${idx++}`);
    vals.push(filter.stage_id);
  }
  if (filter.newsletter !== undefined) {
    conds.push(`c.newsletter_aktiv = $${idx++}`);
    vals.push(filter.newsletter);
  }
  if (filter.tags?.length) {
    conds.push(`c.id IN (SELECT customer_id FROM sebo.customer_tags WHERE tag_id = ANY($${idx++}::int[]))`);
    vals.push(filter.tags);
  }
  if (filter.min_orders) {
    conds.push(`(SELECT COUNT(*) FROM sebo.orders WHERE customer_id = c.id AND status != 'cancelled') >= $${idx++}`);
    vals.push(filter.min_orders);
  }
  if (filter.min_summe_cent) {
    conds.push(`(SELECT COALESCE(SUM(total_cents),0) FROM sebo.orders WHERE customer_id = c.id AND status != 'cancelled') >= $${idx++}`);
    vals.push(filter.min_summe_cent);
  }

  const where = `WHERE ${conds.join(" AND ")}`;
  const safeLimit = Math.max(1, Math.min(10000, Number(limit) || 100));
  const [c, d] = await Promise.all([
    query<{ treffer: number }>(`SELECT COUNT(*)::int AS treffer FROM sebo.customers c ${where}`, vals),
    query<{ id: string }>(`SELECT c.id FROM sebo.customers c ${where} LIMIT $${vals.length + 1}`, [...vals, safeLimit]),
  ]);

  return {
    treffer: c.rows[0]?.treffer ?? 0,
    ids:     d.rows.map(r => r.id),
  };
}

// ===========================================================================
// DRIP FLOWS
// ===========================================================================
export async function alleDripFlows(): Promise<DripFlow[]> {
  const r = await query<DripFlow>(`SELECT * FROM sebo.drip_flows ORDER BY erstellt_am DESC`);
  return r.rows;
}

export async function dripFlowMitSchritten(id: string): Promise<DripFlow | null> {
  const flowRes = await query<DripFlow>(`SELECT * FROM sebo.drip_flows WHERE id = $1`, [id]);
  if (!flowRes.rows[0]) return null;
  const stepsRes = await query<DripFlowStep>(
    `SELECT * FROM sebo.drip_flow_steps WHERE flow_id = $1 ORDER BY schritt_nr`,
    [id]
  );
  return { ...flowRes.rows[0], schritte: stepsRes.rows };
}

export async function dripFlowErstellen(data: {
  name: string;
  beschreibung?: string;
  trigger_typ: DripFlow["trigger_typ"];
  trigger_param?: string;
  segment_id?: string;
}): Promise<DripFlow> {
  const r = await query<DripFlow>(
    `INSERT INTO sebo.drip_flows (name, beschreibung, trigger_typ, trigger_param, segment_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.name, data.beschreibung ?? null, data.trigger_typ, data.trigger_param ?? null, data.segment_id ?? null]
  );
  return r.rows[0];
}

export async function dripFlowToggleAktiv(id: string, aktiv: boolean): Promise<void> {
  await query(`UPDATE sebo.drip_flows SET aktiv = $1 WHERE id = $2`, [aktiv, id]);
}

export async function dripFlowLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.drip_flows WHERE id = $1`, [id]);
}

// ===========================================================================
// EVENTS
// ===========================================================================
export async function eventLoggen(data: {
  customer_id?:    string;
  customer_email?: string;
  typ:             string;
  daten?:          Record<string, unknown>;
  quelle?:         string;
}): Promise<void> {
  await query(
    `INSERT INTO sebo.crm_events (customer_id, customer_email, typ, daten, quelle)
     VALUES ($1, $2, $3, $4::jsonb, $5)`,
    [
      data.customer_id ?? null,
      data.customer_email?.toLowerCase() ?? null,
      data.typ,
      JSON.stringify(data.daten ?? {}),
      data.quelle ?? "web",
    ]
  );
}

export async function eventsFuerCustomer(customerId: string, limit = 50): Promise<CrmEvent[]> {
  const r = await query<CrmEvent>(
    `SELECT * FROM sebo.crm_events
     WHERE customer_id = $1
     ORDER BY erstellt_am DESC
     LIMIT $2`,
    [customerId, limit]
  );
  return r.rows;
}

// ===========================================================================
// DNC (Do Not Contact)
// ===========================================================================
export async function dncSetzen(customerId: string, grund?: string): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET dnc_aktiv = true, dnc_grund = $1, dnc_seit = now(),
         newsletter_aktiv = false
     WHERE id = $2`,
    [grund ?? null, customerId]
  );
}

export async function dncPerToken(token: string, grund?: string): Promise<boolean> {
  const r = await query(
    `UPDATE sebo.customers
     SET dnc_aktiv = true, dnc_grund = $1, dnc_seit = now(),
         newsletter_aktiv = false
     WHERE dnc_token = $2`,
    [grund ?? "Per 1-Klick-Link", token]
  );
  return (r.rowCount ?? 0) > 0;
}

// ===========================================================================
// Erweiterung für Kunden-Detail (Stats für UI)
// ===========================================================================
export interface CustomerCrmStats {
  bestellungen_anzahl:  number;
  bestellungen_summe_cent: number;
  letzte_bestellung_am: string | null;
  letztes_event_am:     string | null;
  notes_anzahl:         number;
  tasks_offen:          number;
}

export async function customerCrmStats(customerId: string): Promise<CustomerCrmStats> {
  const r = await query<CustomerCrmStats>(
    `SELECT
       (SELECT COUNT(*)::int FROM sebo.orders WHERE customer_id = $1 AND status != 'cancelled') AS bestellungen_anzahl,
       (SELECT COALESCE(SUM(total_cents),0)::int FROM sebo.orders WHERE customer_id = $1 AND status != 'cancelled') AS bestellungen_summe_cent,
       (SELECT MAX(erstellt_am) FROM sebo.orders WHERE customer_id = $1) AS letzte_bestellung_am,
       (SELECT MAX(erstellt_am) FROM sebo.crm_events WHERE customer_id = $1) AS letztes_event_am,
       (SELECT COUNT(*)::int FROM sebo.notes WHERE customer_id = $1) AS notes_anzahl,
       (SELECT COUNT(*)::int FROM sebo.tasks WHERE customer_id = $1 AND status IN ('offen','in_arbeit')) AS tasks_offen`,
    [customerId]
  );
  return r.rows[0];
}

export { withTransaction };
