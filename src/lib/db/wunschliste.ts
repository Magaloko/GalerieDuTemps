import { query } from "./index";
import type { ProduktListItem } from "@/types/produkt";

/** Alle Wunschlisten-Produkte eines Sessions-Token */
export async function wunschlisteProdukte(
  sessionToken: string
): Promise<ProduktListItem[]> {
  const result = await query<ProduktListItem>(
    `SELECT
       p.id, p.name, p.slug, p.preis, p.originalpreis,
       k.name AS kategorie_name,
       p.zustand, p.lagerbestand, p.verkauft, p.featured,
       p.erstellt_am,
       (SELECT pb.url FROM sebo.produktbilder pb
        WHERE pb.produkt_id = p.id AND pb.ist_hauptbild = true LIMIT 1)
        AS hauptbild_url
     FROM sebo.wunschliste w
     JOIN sebo.produkte p ON p.id = w.produkt_id
     LEFT JOIN sebo.kategorien k ON k.id = p.kategorie_id
     WHERE w.session_token = $1
     ORDER BY w.erstellt_am DESC`,
    [sessionToken]
  );
  return result.rows;
}

/** Wunschliste: Produkt hinzufügen (idempotent) */
export async function wunschlisteHinzufuegen(
  sessionToken: string,
  produktId: string
): Promise<void> {
  await query(
    `INSERT INTO sebo.wunschliste (session_token, produkt_id)
     VALUES ($1, $2)
     ON CONFLICT (session_token, produkt_id) DO NOTHING`,
    [sessionToken, produktId]
  );
}

/** Wunschliste: Produkt entfernen */
export async function wunschlisteEntfernen(
  sessionToken: string,
  produktId: string
): Promise<void> {
  await query(
    `DELETE FROM sebo.wunschliste
     WHERE session_token = $1 AND produkt_id = $2`,
    [sessionToken, produktId]
  );
}

/** Produkt-IDs der Wunschliste (für Quick-Check) */
export async function wunschlisteIds(sessionToken: string): Promise<string[]> {
  const result = await query<{ produkt_id: string }>(
    `SELECT produkt_id FROM sebo.wunschliste WHERE session_token = $1`,
    [sessionToken]
  );
  return result.rows.map(r => r.produkt_id);
}
