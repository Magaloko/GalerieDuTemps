import { query, withTransaction } from "./index";
import type { Auszahlung, AuszahlungStatus } from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Auszahlungen für Affiliate (eigene Historie)
// ---------------------------------------------------------------------------
export async function auszahlungenFuerAffiliate(affiliateId: string): Promise<Auszahlung[]> {
  const result = await query<Auszahlung>(
    `SELECT * FROM sebo.auszahlungen WHERE affiliate_id = $1 ORDER BY erstellt_am DESC`,
    [affiliateId]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Admin: ausstehende Auszahlungs-Kandidaten
// (Summe bestaetigt-Provisionen pro Affiliate, die Mindestbetrag erreichen)
// ---------------------------------------------------------------------------
export interface AuszahlungsKandidat {
  affiliate_id:         string;
  affiliate_name:       string;
  affiliate_email:      string;
  auszahlungs_methode:  "sepa" | "paypal";
  summe_cent:           number;
  anzahl_provisionen:   number;
}

export async function auszahlungsKandidaten(
  mindestCent: number
): Promise<AuszahlungsKandidat[]> {
  const result = await query<AuszahlungsKandidat>(
    `SELECT
       a.id   AS affiliate_id,
       a.vorname || ' ' || a.nachname AS affiliate_name,
       a.email AS affiliate_email,
       a.auszahlungs_methode,
       SUM(p.betrag_cent)::int  AS summe_cent,
       COUNT(p.id)::int         AS anzahl_provisionen
     FROM sebo.provisionen p
     JOIN sebo.affiliates  a ON a.id = p.affiliate_id
     WHERE p.status = 'bestaetigt' AND p.auszahlung_id IS NULL
       AND a.status = 'aktiv'
     GROUP BY a.id, a.vorname, a.nachname, a.email, a.auszahlungs_methode
     HAVING SUM(p.betrag_cent) >= $1
     ORDER BY summe_cent DESC`,
    [mindestCent]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Auszahlung erstellen + alle bestaetigten Provisionen zuordnen
// ---------------------------------------------------------------------------
export async function auszahlungErstellen(data: {
  affiliate_id: string;
  methode:      "sepa" | "paypal";
  referenz?:    string;
  notiz?:       string;
}): Promise<Auszahlung | null> {
  return withTransaction(async (client) => {
    // Summe aller bestätigten, unzugeordneten Provisionen
    const sumRes = await client.query<{ summe: number; anzahl: number }>(
      `SELECT COALESCE(SUM(betrag_cent), 0)::int AS summe,
              COUNT(*)::int AS anzahl
       FROM sebo.provisionen
       WHERE affiliate_id = $1 AND status = 'bestaetigt' AND auszahlung_id IS NULL`,
      [data.affiliate_id]
    );

    const summe = sumRes.rows[0]?.summe ?? 0;
    if (summe <= 0) return null;

    // Auszahlung erstellen
    const auszahlungRes = await client.query<Auszahlung>(
      `INSERT INTO sebo.auszahlungen
         (affiliate_id, betrag_cent, methode, referenz, notiz)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.affiliate_id,
        summe,
        data.methode,
        data.referenz ?? `Auszahlung ${new Date().toISOString().slice(0, 10)}`,
        data.notiz ?? null,
      ]
    );
    const auszahlung = auszahlungRes.rows[0];

    // Provisionen zuordnen + auf 'ausgezahlt' setzen
    await client.query(
      `UPDATE sebo.provisionen
       SET auszahlung_id = $1,
           status        = 'ausgezahlt',
           ausgezahlt_am = now()
       WHERE affiliate_id = $2 AND status = 'bestaetigt' AND auszahlung_id IS NULL`,
      [auszahlung.id, data.affiliate_id]
    );

    return auszahlung;
  });
}

// ---------------------------------------------------------------------------
// Auszahlung als bezahlt markieren
// ---------------------------------------------------------------------------
export async function auszahlungAlsBezahltMarkieren(
  id: string,
  adminId: string
): Promise<void> {
  await query(
    `UPDATE sebo.auszahlungen
     SET status = 'bezahlt', bezahlt_am = now(), bezahlt_von_admin_id = $1
     WHERE id = $2 AND status = 'erstellt'`,
    [adminId, id]
  );
}

// ---------------------------------------------------------------------------
// Admin: alle Auszahlungen
// ---------------------------------------------------------------------------
export interface AdminAuszahlung extends Auszahlung {
  affiliate_name:  string;
  affiliate_email: string;
}

export async function alleAuszahlungen(params: {
  status?: AuszahlungStatus | "";
  limit?:  number;
}): Promise<AdminAuszahlung[]> {
  const limit = Math.min(200, params.limit ?? 100);
  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.status) {
    conds.push(`au.status = $${idx++}`);
    vals.push(params.status);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const result = await query<AdminAuszahlung>(
    `SELECT au.*,
            a.vorname || ' ' || a.nachname AS affiliate_name,
            a.email AS affiliate_email
     FROM sebo.auszahlungen au
     JOIN sebo.affiliates    a ON a.id = au.affiliate_id
     ${where}
     ORDER BY au.erstellt_am DESC
     LIMIT $${idx}`,
    [...vals, limit]
  );
  return result.rows;
}
