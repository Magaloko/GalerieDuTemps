import { query } from "./index";
import type { Customer, CustomerType, Address } from "@/types/commerce";

/** Customer per ID */
export async function customerById(id: string): Promise<Customer | null> {
  const r = await query<Customer>(`SELECT * FROM sebo.customers WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

/** Customer per E-Mail */
export async function customerByEmail(
  email: string
): Promise<(Customer & { passwort_hash: string | null }) | null> {
  const r = await query<Customer & { passwort_hash: string | null }>(
    `SELECT * FROM sebo.customers WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );
  return r.rows[0] ?? null;
}

/** Per DNC-Token (für Newsletter-Abmelden) */
export async function customerByDncToken(token: string): Promise<Customer | null> {
  const r = await query<Customer>(
    `SELECT * FROM sebo.customers WHERE dnc_token = $1`,
    [token]
  );
  return r.rows[0] ?? null;
}

/** Customer anlegen (Signup oder Gast→Account) */
export async function customerErstellen(data: {
  email:         string;
  passwort_hash?: string;
  vorname?:      string;
  nachname?:     string;
  telefon?:      string;
  customer_type?: CustomerType;
  company_name?: string;
  ust_id?:       string;
  company_note?: string;
  agb_akzeptiert: boolean;
}): Promise<Customer> {
  const r = await query<Customer>(
    `INSERT INTO sebo.customers
       (email, passwort_hash, vorname, nachname, telefon,
        customer_type, company_name, ust_id, company_note, agb_akzeptiert_am)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $10 THEN now() ELSE NULL END)
     ON CONFLICT (email) DO UPDATE SET
       aktualisiert_am = now()
     RETURNING *`,
    [
      data.email.toLowerCase(),
      data.passwort_hash ?? null,
      data.vorname       ?? null,
      data.nachname      ?? null,
      data.telefon       ?? null,
      data.customer_type ?? "b2c",
      data.company_name  ?? null,
      data.ust_id        ?? null,
      data.company_note  ?? null,
      data.agb_akzeptiert,
    ]
  );
  return r.rows[0];
}

/** Profil-Update */
export async function customerProfilAktualisieren(
  id: string,
  data: Partial<{
    vorname:           string;
    nachname:          string;
    telefon:           string | null;
    whatsapp:          string | null;
    telegram_username: string | null;
    kontakt_kanal:     string | null;
    billing_address:   Address;
    shipping_address:  Address;
    geburtsdatum:      string | null;
    newsletter_aktiv:  boolean;
  }>
): Promise<void> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (key === "billing_address" || key === "shipping_address") {
        felder.push(`${key} = $${idx++}::jsonb`);
        werte.push(JSON.stringify(value));
      } else {
        felder.push(`${key} = $${idx++}`);
        werte.push(value);
      }
    }
  }
  if (felder.length === 0) return;

  werte.push(id);
  await query(
    `UPDATE sebo.customers SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );
}

/** Newsletter-Status setzen (Double-Opt-In) */
export async function customerNewsletterBestaetigen(id: string): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET newsletter_aktiv = true, newsletter_bestaetigt_am = now()
     WHERE id = $1`,
    [id]
  );
}

/** E-Mail-Bestätigung (Account-Activation) */
export async function customerEmailBestaetigen(id: string): Promise<void> {
  await query(
    `UPDATE sebo.customers SET email_bestaetigt_am = now() WHERE id = $1`,
    [id]
  );
}

/** B2B-Antrag stellen */
export async function customerB2bAntragStellen(
  id: string,
  data: { company_name: string; ust_id?: string; company_note?: string }
): Promise<void> {
  await query(
    `UPDATE sebo.customers
     SET customer_type = 'b2b_pending',
         company_name = $1,
         ust_id = $2,
         company_note = $3
     WHERE id = $4`,
    [data.company_name, data.ust_id ?? null, data.company_note ?? null, id]
  );
}

/** Letzten Login tracken */
export async function customerLoginTracken(id: string): Promise<void> {
  await query(
    `UPDATE sebo.customers SET letzter_login_am = now() WHERE id = $1`,
    [id]
  );
}

// ---------------------------------------------------------------------------
// Admin: Liste mit Filter
// ---------------------------------------------------------------------------
export interface PaginierteCustomers {
  items:  Customer[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

export async function customersListe(params: {
  seite?:  number;
  limit?:  number;
  typ?:    CustomerType | "";
  suche?:  string;
}): Promise<PaginierteCustomers> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.typ) {
    conds.push(`customer_type = $${idx++}`);
    vals.push(params.typ);
  }
  if (params.suche) {
    conds.push(`(email ILIKE $${idx} OR vorname ILIKE $${idx} OR nachname ILIKE $${idx} OR company_name ILIKE $${idx})`);
    vals.push(`%${params.suche}%`);
    idx++;
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const [c, d] = await Promise.all([
    query<{ gesamt: number }>(`SELECT COUNT(*)::int AS gesamt FROM sebo.customers ${where}`, vals),
    query<Customer>(
      `SELECT * FROM sebo.customers ${where} ORDER BY erstellt_am DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = c.rows[0]?.gesamt ?? 0;
  return { items: d.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}
