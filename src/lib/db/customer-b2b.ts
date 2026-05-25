import { query } from "./index";
import type { CustomerType } from "@/types/commerce";

/** B2B-Antrag freischalten */
export async function b2bFreischalten(customerId: string): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET customer_type = 'b2b_verified'
     WHERE id = $1 AND customer_type = 'b2b_pending'`,
    [customerId]
  );
}

/** B2B-Antrag ablehnen → customer_type bleibt aber b2b_rejected (Begründung im company_note) */
export async function b2bAblehnen(customerId: string, grund: string): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET customer_type = 'b2b_rejected',
         company_note  = company_note || E'\n\n-- ABGELEHNT --\n' || $1
     WHERE id = $2`,
    [grund, customerId]
  );
}

/** B2B-Antrag aktualisieren (vom Customer selbst) */
export async function b2bAntragAktualisieren(
  customerId: string,
  data: { company_name: string; ust_id?: string; company_note?: string }
): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET customer_type = 'b2b_pending',
         company_name  = $1,
         ust_id        = $2,
         company_note  = $3
     WHERE id = $4`,
    [data.company_name, data.ust_id ?? null, data.company_note ?? null, customerId]
  );
}

/** Liste aller B2B-Anträge (pending zuerst) */
export interface B2bAntrag {
  id:           string;
  email:        string;
  vorname:      string | null;
  nachname:     string | null;
  customer_type: CustomerType;
  company_name: string | null;
  ust_id:       string | null;
  company_note: string | null;
  erstellt_am:  string;
}

export async function b2bAntraegeListe(status?: "pending" | "verified" | "rejected" | ""): Promise<B2bAntrag[]> {
  let where = `customer_type IN ('b2b_pending', 'b2b_verified', 'b2b_rejected')`;
  if (status === "pending")  where = `customer_type = 'b2b_pending'`;
  if (status === "verified") where = `customer_type = 'b2b_verified'`;
  if (status === "rejected") where = `customer_type = 'b2b_rejected'`;

  const r = await query<B2bAntrag>(
    `SELECT id, email, vorname, nachname, customer_type,
            company_name, ust_id, company_note, erstellt_am
     FROM sebo.customers
     WHERE ${where}
     ORDER BY CASE customer_type WHEN 'b2b_pending' THEN 0 WHEN 'b2b_verified' THEN 1 ELSE 2 END,
              erstellt_am DESC`
  );
  return r.rows;
}

// ---------------------------------------------------------------------------
// Discount-Tiers
// ---------------------------------------------------------------------------
export interface DiscountTier {
  id:             number;
  customer_type:  string;
  min_summe_cent: number;
  rabatt_prozent: number;
  label:          string | null;
  aktiv:          boolean;
}

export async function alleDiscountTiers(): Promise<DiscountTier[]> {
  const r = await query<DiscountTier>(
    `SELECT * FROM sebo.discount_tiers WHERE aktiv = true ORDER BY customer_type, min_summe_cent`
  );
  return r.rows;
}

/** Findet den passenden Rabatt-Tier für eine Summe + Customer-Type */
export async function findeRabattTier(
  customerType: CustomerType,
  summeCent: number
): Promise<DiscountTier | null> {
  const r = await query<DiscountTier>(
    `SELECT * FROM sebo.discount_tiers
     WHERE aktiv = true
       AND customer_type = $1
       AND min_summe_cent <= $2
     ORDER BY min_summe_cent DESC
     LIMIT 1`,
    [customerType, summeCent]
  );
  return r.rows[0] ?? null;
}
