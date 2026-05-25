import { query, withTransaction } from "./index";
import type {
  Affiliate,
  AffiliateMitSponsor,
  AffiliateStatus,
} from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Affiliate Lookups
// ---------------------------------------------------------------------------

/** Affiliate per E-Mail (für Login) – inkl. passwort_hash */
export async function affiliateByEmail(email: string): Promise<
  (Affiliate & { passwort_hash: string }) | null
> {
  const result = await query<Affiliate & { passwort_hash: string }>(
    `SELECT * FROM sebo.affiliates WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

/** Affiliate per ID */
export async function affiliateById(id: string): Promise<Affiliate | null> {
  const result = await query<Affiliate>(
    `SELECT *, (iban_verschluesselt IS NOT NULL) AS hat_iban
     FROM sebo.affiliates WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/** Affiliate per Referral-Code (heißer Pfad - im LRU cachen) */
export async function affiliateByReferralCode(code: string): Promise<Affiliate | null> {
  const result = await query<Affiliate>(
    `SELECT * FROM sebo.affiliates
     WHERE referral_code = $1 AND status = 'aktiv'`,
    [code.toUpperCase()]
  );
  return result.rows[0] ?? null;
}

/** Existiert ein Referral-Code bereits? (Kollisions-Check) */
export async function referralCodeExistiert(code: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM sebo.affiliates WHERE referral_code = $1 LIMIT 1`,
    [code.toUpperCase()]
  );
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Affiliate erstellen (Registrierung)
// ---------------------------------------------------------------------------
export async function affiliateErstellen(data: {
  email:                  string;
  passwort_hash:          string;
  vorname:                string;
  nachname:               string;
  referral_code:          string;
  sponsor_id:             string | null;
  agb_version:            string;
  ist_kleinunternehmer:   boolean;
  gewerbe_angemeldet:     boolean;
}): Promise<Affiliate> {
  // Ebene im Baum berechnen
  let ebene = 0;
  if (data.sponsor_id) {
    const sponsorRes = await query<{ ebene_im_baum: number }>(
      `SELECT ebene_im_baum FROM sebo.affiliates WHERE id = $1`,
      [data.sponsor_id]
    );
    ebene = (sponsorRes.rows[0]?.ebene_im_baum ?? 0) + 1;
  }

  const result = await query<Affiliate>(
    `INSERT INTO sebo.affiliates
       (email, passwort_hash, vorname, nachname, referral_code, sponsor_id,
        ebene_im_baum, status, ist_kleinunternehmer, gewerbe_angemeldet,
        agb_version_akzeptiert, agb_akzeptiert_am, datenschutz_akzeptiert_am)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,now(),now())
     RETURNING *`,
    [
      data.email.toLowerCase(),
      data.passwort_hash,
      data.vorname,
      data.nachname,
      data.referral_code.toUpperCase(),
      data.sponsor_id,
      ebene,
      data.ist_kleinunternehmer,
      data.gewerbe_angemeldet,
      data.agb_version,
    ]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Admin: Liste + Freischaltung
// ---------------------------------------------------------------------------
export interface PaginierteAffiliates {
  items:  AffiliateMitSponsor[];
  gesamt: number;
  seite:  number;
  seiten: number;
}

export async function affiliatesListe(params: {
  seite?:  number;
  limit?:  number;
  status?: AffiliateStatus | "";
  suche?:  string;
}): Promise<PaginierteAffiliates> {
  const seite  = Math.max(1, params.seite ?? 1);
  const limit  = Math.min(100, params.limit ?? 20);
  const offset = (seite - 1) * limit;

  const conds: string[] = [];
  const vals:  unknown[] = [];
  let idx = 1;

  if (params.status) {
    conds.push(`a.status = $${idx++}`);
    vals.push(params.status);
  }
  if (params.suche) {
    conds.push(`(a.email ILIKE $${idx} OR a.vorname ILIKE $${idx} OR a.nachname ILIKE $${idx} OR a.referral_code ILIKE $${idx})`);
    vals.push(`%${params.suche}%`);
    idx++;
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";

  const [countRes, dataRes] = await Promise.all([
    query<{ gesamt: number }>(
      `SELECT COUNT(*)::int AS gesamt FROM sebo.affiliates a ${where}`,
      vals
    ),
    query<AffiliateMitSponsor>(
      `SELECT
         a.*,
         s.vorname || ' ' || s.nachname AS sponsor_name,
         s.email AS sponsor_email
       FROM sebo.affiliates a
       LEFT JOIN sebo.affiliates s ON s.id = a.sponsor_id
       ${where}
       ORDER BY
         CASE a.status WHEN 'pending' THEN 0 WHEN 'aktiv' THEN 1
                       WHEN 'gesperrt' THEN 2 ELSE 3 END,
         a.erstellt_am DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...vals, limit, offset]
    ),
  ]);

  const gesamt = countRes.rows[0]?.gesamt ?? 0;
  return { items: dataRes.rows, gesamt, seite, seiten: Math.ceil(gesamt / limit) };
}

/** Affiliate freischalten (pending → aktiv) */
export async function affiliateFreischalten(id: string, adminId: string): Promise<void> {
  await query(
    `UPDATE sebo.affiliates
     SET status = 'aktiv',
         freigeschaltet_am = now(),
         freigeschaltet_von = $1
     WHERE id = $2 AND status = 'pending'`,
    [adminId, id]
  );
}

/** Affiliate sperren */
export async function affiliateSperren(id: string, grund: string): Promise<void> {
  await query(
    `UPDATE sebo.affiliates SET status = 'gesperrt', sperr_grund = $1 WHERE id = $2`,
    [grund, id]
  );
}

/** Letzten Login tracken */
export async function loginGetrackt(id: string): Promise<void> {
  await query(
    `UPDATE sebo.affiliates SET letzter_login_am = now() WHERE id = $1`,
    [id]
  );
}

// ---------------------------------------------------------------------------
// Downline (geworbene Affiliates – bis 2 Ebenen tief)
// ---------------------------------------------------------------------------
export interface DownlineEintrag {
  id:              string;
  vorname:         string;
  nachname:        string;
  email:           string;
  referral_code:   string;
  status:          AffiliateStatus;
  ebene_relativ:   1 | 2;          // relativ zur Wurzel
  erstellt_am:     string;
}

export async function downlineLaden(affiliateId: string): Promise<DownlineEintrag[]> {
  const result = await query<DownlineEintrag>(
    `WITH RECURSIVE downline AS (
       -- Ebene 1: direkte Sub-Affiliates
       SELECT id, vorname, nachname, email, referral_code, status,
              1::smallint AS ebene_relativ, erstellt_am
       FROM sebo.affiliates
       WHERE sponsor_id = $1

       UNION ALL

       -- Ebene 2: deren Sub-Affiliates
       SELECT a.id, a.vorname, a.nachname, a.email, a.referral_code, a.status,
              2::smallint AS ebene_relativ, a.erstellt_am
       FROM sebo.affiliates a
       INNER JOIN downline d ON a.sponsor_id = d.id
       WHERE d.ebene_relativ = 1
     )
     SELECT * FROM downline ORDER BY ebene_relativ, erstellt_am DESC`,
    [affiliateId]
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Profil aktualisieren
// ---------------------------------------------------------------------------
export async function profilAktualisieren(
  id: string,
  data: {
    vorname?:             string;
    nachname?:            string;
    auszahlungs_methode?: "sepa" | "paypal" | "kaspi" | "iic_transfer";
    paypal_email?:        string | null;
    bic?:                 string | null;
    kontoinhaber?:        string | null;
    steuer_id?:           string | null;
    ist_kleinunternehmer?: boolean;
    gewerbe_angemeldet?:  boolean;
    // KZ-Felder (Phase 11)
    iic?:                  string | null;
    bik?:                  string | null;
    iin_affiliate?:        string | null;
    bin_affiliate?:        string | null;
    kbe_affiliate?:        number | null;
    kaspi_telefon?:        string | null;
  }
): Promise<void> {
  const felder: string[] = [];
  const werte:  unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      felder.push(`${key} = $${idx++}`);
      werte.push(value);
    }
  }
  if (felder.length === 0) return;
  werte.push(id);
  await query(
    `UPDATE sebo.affiliates SET ${felder.join(", ")} WHERE id = $${idx}`,
    werte
  );
}

/** IBAN verschlüsselt speichern (pgcrypto) */
export async function ibanSpeichern(
  id: string,
  iban: string,
  encryptionKey: string
): Promise<void> {
  await query(
    `UPDATE sebo.affiliates
     SET iban_verschluesselt = pgp_sym_encrypt($1, $2)
     WHERE id = $3`,
    [iban, encryptionKey, id]
  );
}

/** IBAN entschlüsseln (nur für PDF-Generierung im Admin-Kontext) */
export async function ibanLaden(id: string, encryptionKey: string): Promise<string | null> {
  const result = await query<{ iban: string }>(
    `SELECT pgp_sym_decrypt(iban_verschluesselt, $2)::text AS iban
     FROM sebo.affiliates
     WHERE id = $1 AND iban_verschluesselt IS NOT NULL`,
    [id, encryptionKey]
  );
  return result.rows[0]?.iban ?? null;
}

/** Passwort ändern */
export async function passwortAendern(id: string, neuerHash: string): Promise<void> {
  await query(
    `UPDATE sebo.affiliates SET passwort_hash = $1 WHERE id = $2`,
    [neuerHash, id]
  );
}

// ---------------------------------------------------------------------------
// Transaktions-Helper für Registrierung mit Sponsor-Lookup
// ---------------------------------------------------------------------------
export async function affiliateRegistrierungTx<T>(
  callback: (helpers: {
    sponsorByCode: (code: string) => Promise<Affiliate | null>;
    erstellen:     typeof affiliateErstellen;
  }) => Promise<T>
): Promise<T> {
  return withTransaction(async () => {
    return callback({
      sponsorByCode: affiliateByReferralCode,
      erstellen:     affiliateErstellen,
    });
  });
}
