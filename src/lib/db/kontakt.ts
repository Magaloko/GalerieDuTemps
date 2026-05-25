import { query } from "./index";

export type KontaktStatus = "neu" | "gelesen" | "beantwortet" | "verkauft" | "archiviert";

export interface Kontaktanfrage {
  id:           string;
  name:         string;
  email:        string;
  betreff:      string | null;
  nachricht:    string;
  produkt_id:   string | null;
  produkt_name: string | null;
  produkt_slug: string | null;
  status:       KontaktStatus;
  ip_adresse:   string | null;
  erstellt_am:  string;
}

export interface PaginierteAnfragen {
  items:  Kontaktanfrage[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

/** Liste mit optionalem Status-Filter */
export async function kontaktanfragenListe(params: {
  seite?:  number;
  limit?:  number;
  status?: KontaktStatus | "";
}): Promise<PaginierteAnfragen> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(50, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.status) {
    conds.push(`k.status = $${idx++}`);
    vals.push(params.status);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

  const [countRes, dataRes] = await Promise.all([
    query<{ gesamt: number }>(
      `SELECT COUNT(*)::int AS gesamt FROM sebo.kontaktanfragen k ${where}`,
      vals
    ),
    query<Kontaktanfrage>(
      `SELECT
         k.id, k.name, k.email, k.betreff, k.nachricht,
         k.produkt_id, p.name AS produkt_name, p.slug AS produkt_slug,
         k.status, k.ip_adresse::text, k.erstellt_am
       FROM sebo.kontaktanfragen k
       LEFT JOIN sebo.produkte p ON p.id = k.produkt_id
       ${where}
       ORDER BY
         CASE k.status WHEN 'neu' THEN 0 WHEN 'gelesen' THEN 1
                       WHEN 'beantwortet' THEN 2 ELSE 3 END,
         k.erstellt_am DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = countRes.rows[0]?.gesamt ?? 0;
  return { items: dataRes.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

/** Status aktualisieren */
export async function kontaktStatusUpdate(id: string, status: KontaktStatus): Promise<void> {
  await query(
    `UPDATE sebo.kontaktanfragen SET status = $1 WHERE id = $2`,
    [status, id]
  );
}

/** Anfrage löschen */
export async function kontaktLoeschen(id: string): Promise<void> {
  await query(`DELETE FROM sebo.kontaktanfragen WHERE id = $1`, [id]);
}
