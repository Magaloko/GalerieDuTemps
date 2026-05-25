// ---------------------------------------------------------------------------
// Affiliate-Typen (spiegeln sebo.affiliate_* DB-Tabellen wider)
// ---------------------------------------------------------------------------

export type AffiliateStatus = "pending" | "aktiv" | "gesperrt" | "geloescht";
export type AuszahlungsMethode = "sepa" | "paypal" | "kaspi" | "iic_transfer";
export type ProvisionStatus = "offen" | "bestaetigt" | "storniert" | "ausgezahlt";
export type AuszahlungStatus = "erstellt" | "bezahlt" | "storniert";

export interface Affiliate {
  id:                        string;
  email:                     string;
  vorname:                   string;
  nachname:                  string;
  hat_iban?:                 boolean;   // berechnet (iban_verschluesselt IS NOT NULL)
  referral_code:             string;
  sponsor_id:                string | null;
  ebene_im_baum:             number;
  status:                    AffiliateStatus;
  auszahlungs_methode:       AuszahlungsMethode;
  bic:                       string | null;
  kontoinhaber:              string | null;
  paypal_email:              string | null;
  steuer_id:                 string | null;
  ist_kleinunternehmer:      boolean;
  gewerbe_angemeldet:        boolean;
  agb_version_akzeptiert:    string | null;
  agb_akzeptiert_am:         string | null;
  datenschutz_akzeptiert_am: string | null;
  freigeschaltet_am:         string | null;
  freigeschaltet_von:        string | null;
  sperr_grund:               string | null;
  letzter_login_am:          string | null;
  // Stripe-Connect (Phase 9f)
  stripe_account_id?:        string | null;
  stripe_payouts_enabled?:   boolean;
  stripe_charges_enabled?:   boolean;
  stripe_connected_am?:      string | null;
  // KZ-Banking (Phase 11)
  iic?:                      string | null;   // ИИК — Bankkonto (KZ + 18 Stellen)
  bik?:                      string | null;   // БИК — 8-stelliger Bankcode
  iin_affiliate?:            string | null;   // Persönliche ИИН (12 Stellen)
  bin_affiliate?:            string | null;   // Firmen-БИН (12 Stellen)
  kbe_affiliate?:            number | null;   // КБе (2 Stellen, z.B. 19 = jur. Person)
  kaspi_telefon?:            string | null;   // Kaspi.kz-Nummer für Auszahlung
  erstellt_am:               string;
  aktualisiert_am:           string;
}

/** Globale System-Einstellungen (Firma/SEPA/Stripe) */
export interface SystemEinstellungen {
  // Firma
  firma_name:           string;
  firma_strasse:        string;
  firma_plz:            string;
  firma_ort:            string;
  firma_land:           string;
  firma_email:          string;
  firma_telefon:        string;
  firma_steuer_id:      string;
  firma_ust_id:         string;
  firma_handelsregister: string;
  // SEPA
  sepa_absender_iban:   string;
  sepa_absender_bic:    string;
  sepa_absender_name:   string;
  sepa_creditor_id:     string;
  // Stripe
  stripe_connect_enabled: boolean;
  stripe_publishable_key: string;
  stripe_mode:          "test" | "live";
  // Cookies
  cookie_banner_aktiv:  boolean;
  analytics_aktiv:      boolean;
}

/** Inkl. Sponsor-Name für Listen-Darstellung */
export interface AffiliateMitSponsor extends Affiliate {
  sponsor_name: string | null;
  sponsor_email: string | null;
}

export interface AffiliateKlick {
  id:            number;
  referral_code: string;
  affiliate_id:  string | null;
  ip_hash:       string | null;
  ua_hash:       string | null;
  referer:       string | null;
  landing_url:   string | null;
  user_agent:    string | null;
  ist_bot:       boolean;
  erstellt_am:   string;
}

export interface AffiliateAttribution {
  id:                     string;
  kontaktanfrage_id:      string;
  affiliate_id:           string;
  referral_code_snapshot: string;
  klick_id:               number | null;
  ip_hash:                string | null;
  ua_hash:                string | null;
  flag_verdaechtig:       boolean;
  attribution_zeitpunkt:  string;
}

export interface Provision {
  id:                 string;
  attribution_id:     string;
  kontaktanfrage_id:  string;
  produkt_id:         string | null;
  verkaufspreis_cent: number;
  affiliate_id:       string;
  ebene:              1 | 2 | 3;
  satz_prozent:       number;
  betrag_cent:        number;
  status:             ProvisionStatus;
  stornogrund:        string | null;
  auszahlung_id:      string | null;
  erstellt_am:        string;
  bestaetigt_am:      string | null;
  storniert_am:       string | null;
  ausgezahlt_am:      string | null;
}

/** Provision angereichert für Affiliate-Dashboard */
export interface ProvisionMitDetails extends Provision {
  produkt_name:    string | null;
  produkt_slug:    string | null;
  kontakt_name:    string;
}

export interface Auszahlung {
  id:                   string;
  affiliate_id:         string;
  betrag_cent:          number;
  methode:              AuszahlungsMethode;
  referenz:             string | null;
  pdf_pfad:             string | null;
  notiz:                string | null;
  status:               AuszahlungStatus;
  bezahlt_am:           string | null;
  bezahlt_von_admin_id: string | null;
  erstellt_am:          string;
}

// ---------------------------------------------------------------------------
// Einstellungen (typisiert)
// ---------------------------------------------------------------------------
export interface AffiliateEinstellungen {
  provision_ebene_1_prozent: number;
  provision_ebene_2_prozent: number;
  provision_ebene_3_prozent: number;
  cookie_ttl_tage:           number;
  mindestauszahlung_cent:    number;
  widerrufs_frist_tage:      number;
  registrierung_offen:       boolean;
  agb_aktuelle_version:      string;
}

// ---------------------------------------------------------------------------
// Stats / Aggregate
// ---------------------------------------------------------------------------
export interface AffiliateStats {
  klicks_gesamt:        number;
  klicks_30tage:        number;
  attributionen_gesamt: number;
  verkaeufe_gesamt:     number;
  conversion_rate:      number;
  provision_offen:      number;
  provision_bestaetigt: number;
  provision_ausgezahlt: number;
  downline_direkt:      number;
  downline_indirekt:    number;
}
