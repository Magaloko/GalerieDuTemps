import { query, withTransaction } from "./index";
import type { Produktbild } from "@/types/produkt";

/** Alle Bilder eines Produkts (sortiert) */
export async function bilderFuerProdukt(produktId: string): Promise<Produktbild[]> {
  const result = await query<Produktbild>(
    `SELECT * FROM sebo.produktbilder
     WHERE produkt_id = $1
     ORDER BY sortierung, erstellt_am`,
    [produktId]
  );
  return result.rows;
}

/** Bild einfügen (inkl. WebP-Varianten aus der Upload-Pipeline) */
export async function bildEinfuegen(data: {
  produkt_id:    string;
  url:           string;
  url_thumb?:    string;
  url_medium?:   string;
  url_large?:    string;
  format?:       string;
  alt_text?:     string;
  ist_hauptbild: boolean;
  dateigroesse?: number;
  breite?:       number;
  hoehe?:        number;
}): Promise<Produktbild> {
  // Sortierungsnummer = max + 1
  const sortResult = await query<{ max: number }>(
    `SELECT COALESCE(MAX(sortierung), -1) + 1 AS max
     FROM sebo.produktbilder WHERE produkt_id = $1`,
    [data.produkt_id]
  );
  const sortierung = sortResult.rows[0]?.max ?? 0;

  const result = await query<Produktbild>(
    `INSERT INTO sebo.produktbilder
       (produkt_id, url, url_thumb, url_medium, url_large, format,
        alt_text, sortierung, ist_hauptbild, dateigroesse, breite, hoehe)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      data.produkt_id,
      data.url,
      data.url_thumb  ?? null,
      data.url_medium ?? null,
      data.url_large  ?? null,
      data.format     ?? null,
      data.alt_text   ?? null,
      sortierung,
      data.ist_hauptbild,
      data.dateigroesse ?? null,
      data.breite       ?? null,
      data.hoehe        ?? null,
    ]
  );
  return result.rows[0];
}

/** Alt-Text eines Bildes aktualisieren (Inline-Edit in der Galerie) */
export async function bildAltTextUpdate(id: string, altText: string): Promise<void> {
  await query(
    `UPDATE sebo.produktbilder SET alt_text = $1 WHERE id = $2`,
    [altText.slice(0, 200), id],
  );
}

/** Bild löschen */
export async function bildLoeschen(id: string): Promise<Produktbild | null> {
  const result = await query<Produktbild>(
    `DELETE FROM sebo.produktbilder WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}

/** Reihenfolge der Bilder aktualisieren */
export async function bilderSortierungAktualisieren(
  updates: Array<{ id: string; sortierung: number }>
): Promise<void> {
  await withTransaction(async (client) => {
    for (const { id, sortierung } of updates) {
      await client.query(
        `UPDATE sebo.produktbilder SET sortierung = $1 WHERE id = $2`,
        [sortierung, id]
      );
    }
  });
}

/** Hauptbild setzen (setzt alle anderen auf false) */
export async function hauptbildSetzen(id: string, produktId: string): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE sebo.produktbilder SET ist_hauptbild = false WHERE produkt_id = $1`,
      [produktId]
    );
    await client.query(
      `UPDATE sebo.produktbilder SET ist_hauptbild = true WHERE id = $1`,
      [id]
    );
  });
}
