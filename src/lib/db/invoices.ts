import { query } from "./index";
import { orderById } from "./orders";
import type { Order } from "@/types/commerce";

export interface Invoice {
  id:               string;
  invoice_number:   number;
  order_id:         string;
  customer_id:      string | null;
  rechnungs_datum:  string;
  leistungs_datum:  string | null;
  faellig_am:       string | null;
  netto_cents:      number;
  tax_cents:        number;
  brutto_cents:     number;
  waehrung:         string;
  empfaenger_name:  string | null;
  empfaenger_email: string | null;
  empfaenger_adresse: Record<string, string>;
  empfaenger_ust_id: string | null;
  reverse_charge:   boolean;
  kleinunternehmer: boolean;
  bildungsleistung: boolean;
  status:           "offen" | "bezahlt" | "storniert" | "gutschrift";
  bezahlt_am:       string | null;
  erstellt_am:      string;
}

/** Findet bestehende Rechnung zu Order oder erstellt eine neue */
export async function rechnungZuOrder(orderId: string): Promise<Invoice | null> {
  // Vorhandene?
  const vorh = await query<Invoice>(
    `SELECT * FROM sebo.invoices WHERE order_id = $1`,
    [orderId]
  );
  if (vorh.rows[0]) return vorh.rows[0];

  // Order laden
  const order = await orderById(orderId);
  if (!order || order.status === "pending") return null;

  // Erzeugen
  const istBildung = (order.items ?? []).some(i => i.tax_exempt);
  const r = await query<Invoice>(
    `INSERT INTO sebo.invoices
       (order_id, customer_id, leistungs_datum, faellig_am,
        netto_cents, tax_cents, brutto_cents,
        empfaenger_name, empfaenger_email, empfaenger_adresse, empfaenger_ust_id,
        reverse_charge, kleinunternehmer, bildungsleistung,
        status, bezahlt_am)
     VALUES ($1,$2,$3, now()::date,
             $4,$5,$6,
             $7,$8,$9::jsonb,$10,
             $11,false,$12,
             $13,$14)
     RETURNING *`,
    [
      order.id,
      order.customer_id,
      order.bezahlt_am ? new Date(order.bezahlt_am).toISOString().slice(0,10) : null,
      order.subtotal_cents - order.tax_total_cents,
      order.tax_total_cents,
      order.total_cents,
      order.customer_name ?? null,
      order.customer_email,
      JSON.stringify(order.billing_address ?? {}),
      order.ust_id_snapshot,
      order.reverse_charge,
      istBildung,
      order.status === "paid" || order.status === "fulfilled" || order.status === "completed" ? "bezahlt" : "offen",
      order.bezahlt_am,
    ]
  );
  return r.rows[0];
}

export async function alleRechnungen(params: {
  status?: string;
  seite?:  number;
  limit?:  number;
}): Promise<{ items: (Invoice & { order_number: number })[]; gesamt: number; seite: number; seiten: number }> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;
  if (params.status) {
    conds.push(`i.status = $${idx++}`);
    vals.push(params.status);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [c, d] = await Promise.all([
    query<{ gesamt: number }>(`SELECT COUNT(*)::int AS gesamt FROM sebo.invoices i ${where}`, vals),
    query<Invoice & { order_number: number }>(
      `SELECT i.*, o.order_number
       FROM sebo.invoices i
       JOIN sebo.orders   o ON o.id = i.order_id
       ${where}
       ORDER BY i.invoice_number DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);
  return { items: d.rows, gesamt: c.rows[0]?.gesamt ?? 0, seite, seiten: Math.ceil((c.rows[0]?.gesamt ?? 0) / limit) };
}

export async function rechnungenFuerCustomer(customerId: string): Promise<Invoice[]> {
  const r = await query<Invoice>(
    `SELECT * FROM sebo.invoices WHERE customer_id = $1 ORDER BY invoice_number DESC`,
    [customerId]
  );
  return r.rows;
}

/** Re-export für gemeinsame Order+Invoice Nutzung */
export { orderById };
export type { Order };
