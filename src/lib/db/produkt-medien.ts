import { query } from "./index";
import type { Produktdatei, Produktzertifikat } from "@/types/produkt";

// ===========================================================================
// Produkt-Dateien (PDFs / Downloads)
// ===========================================================================

export async function dateienFuerProdukt(produktId: string): Promise<Produktdatei[]> {
  const res = await query<Produktdatei>(
    `SELECT id, produkt_id, url, name, dateigroesse, sortierung, erstellt_am
     FROM sebo.produkt_dateien
     WHERE produkt_id = $1
     ORDER BY sortierung, erstellt_am`,
    [produktId]
  );
  return res.rows;
}

export async function dateiEinfuegen(data: {
  produkt_id:    string;
  url:           string;
  name:          string;
  dateigroesse?: number;
}): Promise<Produktdatei> {
  const res = await query<Produktdatei>(
    `INSERT INTO sebo.produkt_dateien (produkt_id, url, name, dateigroesse)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [data.produkt_id, data.url, data.name, data.dateigroesse ?? null]
  );
  return res.rows[0];
}

export async function dateiLoeschen(id: string): Promise<boolean> {
  const res = await query(`DELETE FROM sebo.produkt_dateien WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

// ===========================================================================
// Produkt-Zertifikate
// ===========================================================================

export async function zertifikateFuerProdukt(produktId: string): Promise<Produktzertifikat[]> {
  const res = await query<Produktzertifikat>(
    `SELECT id, produkt_id, url, name, aussteller, datum::text, sortierung, erstellt_am
     FROM sebo.produkt_zertifikate
     WHERE produkt_id = $1
     ORDER BY sortierung, erstellt_am`,
    [produktId]
  );
  return res.rows;
}

export async function zertifikatEinfuegen(data: {
  produkt_id:  string;
  url:         string;
  name:        string;
  aussteller?: string;
  datum?:      string;          // ISO date
}): Promise<Produktzertifikat> {
  const res = await query<Produktzertifikat>(
    `INSERT INTO sebo.produkt_zertifikate (produkt_id, url, name, aussteller, datum)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [
      data.produkt_id,
      data.url,
      data.name,
      data.aussteller ?? null,
      data.datum      ?? null,
    ]
  );
  return res.rows[0];
}

export async function zertifikatLoeschen(id: string): Promise<boolean> {
  const res = await query(`DELETE FROM sebo.produkt_zertifikate WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}
