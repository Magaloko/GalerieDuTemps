import { withTransaction } from "@/lib/db";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import type { Provision } from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Multi-Level-Provisionsberechnung
// Wird vom Admin-Action "Kontaktanfrage als verkauft markieren" aufgerufen.
//
// Ablauf:
// 1. Attribution für kontaktanfrage_id laden → kein Affiliate? → return []
// 2. Affiliate A1 (direkter Werber) + Sponsoren A2, A3 traversieren (max. 3 Ebenen)
// 3. Provisionssätze aus Settings (gefrozen als Snapshot)
// 4. Pro Ebene: provisionen-Row erstellen (Status 'offen')
// 5. Zurückgeben für E-Mail-Versand
// ---------------------------------------------------------------------------
export interface BerechnungsErgebnis {
  provisionen: Provision[];
  betroffene_affiliates: Array<{
    affiliate_id: string;
    email:        string;
    name:         string;
    ebene:        1 | 2 | 3;
    betrag_cent:  number;
  }>;
}

export async function provisionenBerechnen(
  kontaktanfrageId:    string,
  verkaufspreisCent:   number,
  produktId:           string | null
): Promise<BerechnungsErgebnis> {
  if (verkaufspreisCent <= 0) return { provisionen: [], betroffene_affiliates: [] };

  const settings = await affiliateEinstellungenLaden();
  const saetze   = [
    settings.provision_ebene_1_prozent,
    settings.provision_ebene_2_prozent,
    settings.provision_ebene_3_prozent,
  ];

  return withTransaction(async (client) => {
    // 1. Attribution laden
    const attrRes = await client.query<{
      id: string; affiliate_id: string;
    }>(
      `SELECT id, affiliate_id FROM sebo.affiliate_attributionen
       WHERE kontaktanfrage_id = $1`,
      [kontaktanfrageId]
    );
    if (attrRes.rows.length === 0) {
      return { provisionen: [], betroffene_affiliates: [] };
    }
    const attribution = attrRes.rows[0];

    // 2. Ebenen-Kette laden (rekursiv über sponsor_id)
    const kettenRes = await client.query<{
      id:           string;
      vorname:      string;
      nachname:     string;
      email:        string;
      sponsor_id:   string | null;
      status:       string;
      ebene:        number;
    }>(
      `WITH RECURSIVE kette AS (
         SELECT id, vorname, nachname, email, sponsor_id, status, 1 AS ebene
         FROM sebo.affiliates WHERE id = $1
         UNION ALL
         SELECT a.id, a.vorname, a.nachname, a.email, a.sponsor_id, a.status, k.ebene + 1
         FROM sebo.affiliates a
         INNER JOIN kette k ON a.id = k.sponsor_id
         WHERE k.ebene < 3
       )
       SELECT * FROM kette ORDER BY ebene`,
      [attribution.affiliate_id]
    );

    const provisionen: Provision[] = [];
    const betroffene: BerechnungsErgebnis["betroffene_affiliates"] = [];

    for (const stufe of kettenRes.rows) {
      const ebeneNum = stufe.ebene as 1 | 2 | 3;
      if (ebeneNum > 3) continue;
      if (stufe.status !== "aktiv") continue;        // nur aktive bekommen Provision

      const satz = saetze[ebeneNum - 1];
      if (!satz || satz <= 0) continue;              // Ebene deaktiviert (Default Ebene 3 = 0)

      const betrag = Math.floor(verkaufspreisCent * satz / 100);
      if (betrag <= 0) continue;

      const insertRes = await client.query<Provision>(
        `INSERT INTO sebo.provisionen
           (attribution_id, kontaktanfrage_id, produkt_id, verkaufspreis_cent,
            affiliate_id, ebene, satz_prozent, betrag_cent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          attribution.id,
          kontaktanfrageId,
          produktId,
          verkaufspreisCent,
          stufe.id,
          ebeneNum,
          satz,
          betrag,
        ]
      );

      provisionen.push(insertRes.rows[0]);
      betroffene.push({
        affiliate_id: stufe.id,
        email:        stufe.email,
        name:         `${stufe.vorname} ${stufe.nachname}`,
        ebene:        ebeneNum,
        betrag_cent:  betrag,
      });
    }

    return { provisionen, betroffene_affiliates: betroffene };
  });
}
