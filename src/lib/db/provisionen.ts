import { query, withTransaction } from "./index";
import type {
  Provision,
  ProvisionMitDetails,
  ProvisionStatus,
} from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Provisionen für einen Affiliate laden (mit Filter)
// ---------------------------------------------------------------------------
export interface PaginierteProvisionen {
  items:  ProvisionMitDetails[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

export async function provisionenFuerAffiliate(params: {
  affiliate_id: string;
  status?:      ProvisionStatus | "";
  seite?:       number;
  limit?:       number;
}): Promise<PaginierteProvisionen> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = ["p.affiliate_id = $1"];
  const vals:  unknown[] = [params.affiliate_id];
  let idx = 2;

  if (params.status) {
    conds.push(`p.status = $${idx++}`);
    vals.push(params.status);
  }
  const where = `WHERE ${conds.join(" AND ")}`;

  const [countRes, dataRes] = await Promise.all([
    query<{ gesamt: number }>(
      `SELECT COUNT(*)::int AS gesamt FROM sebo.provisionen p ${where}`,
      vals
    ),
    query<ProvisionMitDetails>(
      `SELECT
         p.*,
         pr.name AS produkt_name,
         pr.slug AS produkt_slug,
         k.name  AS kontakt_name
       FROM sebo.provisionen p
       LEFT JOIN sebo.produkte           pr ON pr.id = p.produkt_id
       LEFT JOIN sebo.kontaktanfragen    k  ON k.id  = p.kontaktanfrage_id
       ${where}
       ORDER BY p.erstellt_am DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = countRes.rows[0]?.gesamt ?? 0;
  return { items: dataRes.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

// ---------------------------------------------------------------------------
// Provision aggregierte Summen pro Affiliate
// ---------------------------------------------------------------------------
export interface ProvisionsSummen {
  offen_cent:       number;
  bestaetigt_cent:  number;
  ausgezahlt_cent:  number;
  storniert_cent:   number;
  anzahl_offen:     number;
  anzahl_bestaetigt: number;
  anzahl_ausgezahlt: number;
}

export async function provisionsSummenFuer(affiliateId: string): Promise<ProvisionsSummen> {
  const result = await query<ProvisionsSummen>(
    `SELECT
       COALESCE(SUM(betrag_cent) FILTER (WHERE status = 'offen'),       0)::int AS offen_cent,
       COALESCE(SUM(betrag_cent) FILTER (WHERE status = 'bestaetigt'),  0)::int AS bestaetigt_cent,
       COALESCE(SUM(betrag_cent) FILTER (WHERE status = 'ausgezahlt'),  0)::int AS ausgezahlt_cent,
       COALESCE(SUM(betrag_cent) FILTER (WHERE status = 'storniert'),   0)::int AS storniert_cent,
       COUNT(*)::int FILTER (WHERE status = 'offen')        AS anzahl_offen,
       COUNT(*)::int FILTER (WHERE status = 'bestaetigt')   AS anzahl_bestaetigt,
       COUNT(*)::int FILTER (WHERE status = 'ausgezahlt')   AS anzahl_ausgezahlt
     FROM sebo.provisionen
     WHERE affiliate_id = $1`,
    [affiliateId]
  );
  return result.rows[0] ?? {
    offen_cent: 0, bestaetigt_cent: 0, ausgezahlt_cent: 0, storniert_cent: 0,
    anzahl_offen: 0, anzahl_bestaetigt: 0, anzahl_ausgezahlt: 0,
  };
}

// ---------------------------------------------------------------------------
// Provision einzeln einfügen (wird von Provisionsberechnungs-Service genutzt)
// ---------------------------------------------------------------------------
export async function provisionEinfuegen(data: {
  attribution_id:     string;
  kontaktanfrage_id:  string;
  produkt_id:         string | null;
  verkaufspreis_cent: number;
  affiliate_id:       string;
  ebene:              1 | 2 | 3;
  satz_prozent:       number;
  betrag_cent:        number;
}): Promise<Provision> {
  const result = await query<Provision>(
    `INSERT INTO sebo.provisionen
       (attribution_id, kontaktanfrage_id, produkt_id, verkaufspreis_cent,
        affiliate_id, ebene, satz_prozent, betrag_cent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      data.attribution_id,
      data.kontaktanfrage_id,
      data.produkt_id,
      data.verkaufspreis_cent,
      data.affiliate_id,
      data.ebene,
      data.satz_prozent,
      data.betrag_cent,
    ]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Status-Übergänge
// ---------------------------------------------------------------------------
/** offen → bestaetigt (für Provisionen älter als N Tage) */
export async function provisionenBestaetigen(widerrufsFristTage: number): Promise<number> {
  const result = await query(
    `UPDATE sebo.provisionen
     SET status = 'bestaetigt', bestaetigt_am = now()
     WHERE status = 'offen'
       AND erstellt_am < now() - ($1 || ' days')::interval`,
    [widerrufsFristTage]
  );
  return result.rowCount ?? 0;
}

/** Stornieren (bei Retoure) */
export async function provisionenStornieren(
  kontaktanfrageId: string,
  grund: string
): Promise<number> {
  const result = await query(
    `UPDATE sebo.provisionen
     SET status = 'storniert', stornogrund = $1, storniert_am = now()
     WHERE kontaktanfrage_id = $2
       AND status IN ('offen', 'bestaetigt')`,
    [grund, kontaktanfrageId]
  );
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Admin: globale Provisions-Übersicht
// ---------------------------------------------------------------------------
export interface AdminProvisionsUebersicht extends ProvisionMitDetails {
  affiliate_name:  string;
  affiliate_email: string;
}

export async function adminProvisionenListe(params: {
  status?: ProvisionStatus | "";
  seite?:  number;
  limit?:  number;
}): Promise<{
  items: AdminProvisionsUebersicht[];
  gesamt: number; seite: number; seiten: number;
}> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 30);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;
  if (params.status) {
    conds.push(`p.status = $${idx++}`);
    vals.push(params.status);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [c, d] = await Promise.all([
    query<{ gesamt: number }>(`SELECT COUNT(*)::int AS gesamt FROM sebo.provisionen p ${where}`, vals),
    query<AdminProvisionsUebersicht>(
      `SELECT
         p.*, pr.name AS produkt_name, pr.slug AS produkt_slug,
         k.name AS kontakt_name,
         a.vorname || ' ' || a.nachname AS affiliate_name,
         a.email AS affiliate_email
       FROM sebo.provisionen p
       LEFT JOIN sebo.produkte         pr ON pr.id = p.produkt_id
       LEFT JOIN sebo.kontaktanfragen  k  ON k.id  = p.kontaktanfrage_id
       LEFT JOIN sebo.affiliates       a  ON a.id  = p.affiliate_id
       ${where}
       ORDER BY p.erstellt_am DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = c.rows[0]?.gesamt ?? 0;
  return { items: d.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

// ---------------------------------------------------------------------------
// Re-export für Transaktionen
// ---------------------------------------------------------------------------
export { withTransaction };
