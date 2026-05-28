// ---------------------------------------------------------------------------
// E-Commerce Typen (Phase 10a)
// ---------------------------------------------------------------------------

export type CustomerType  = "b2c" | "b2b_pending" | "b2b_verified" | "b2b_rejected";
export type OrderStatus   = "pending" | "paid" | "fulfilled" | "completed" | "cancelled" | "refunded";

export type PaymentMethod =
  | "stripe_card"
  | "stripe_sepa"
  | "paypal"
  | "crypto_nowpayments"
  | "bank_transfer"
  | "vor_ort"
  | "vor_ort_anzahlung"
  | "telegram_payments"
  | "kaspi";

export type PaymentStatus = "unpaid" | "pending" | "partial" | "paid" | "refunded" | "failed";
export type CouponTyp     = "prozent" | "fest";
export type B2cMode       = "visible" | "teaser" | "hidden";

export interface Address {
  vorname?:  string;
  nachname?: string;
  firma?:    string;
  strasse:   string;
  plz:       string;
  ort:       string;
  land:      string;          // ISO Code "DE", "AT"
  telefon?:  string;
}

export interface Customer {
  id:                 string;
  /** Optional: NULL bei Telegram-first-Accounts (Identität = telegram_chat_id). */
  email:              string | null;
  customer_number:    number;
  vorname:            string | null;
  nachname:           string | null;
  telefon:            string | null;
  // Kontakt-Präferenzen (siehe sql/049_kontakt_praeferenzen.sql)
  whatsapp?:          string | null;
  kontakt_kanal?:     string | null;   // telegram | telefon | whatsapp | email
  customer_type:      CustomerType;
  company_name:       string | null;
  ust_id:             string | null;
  company_note:       string | null;
  billing_address:    Address | Record<string, never>;
  shipping_address:   Address | Record<string, never>;
  newsletter_aktiv:   boolean;
  newsletter_bestaetigt_am: string | null;
  dnc_token:          string;
  dnc_aktiv?:         boolean;
  dnc_grund?:         string | null;
  dnc_seit?:          string | null;
  pipeline_stage_id?: number | null;
  crm_score?:         number;
  geburtsdatum:       string | null;
  agb_akzeptiert_am:  string | null;
  email_bestaetigt_am: string | null;
  letzter_login_am:   string | null;
  erstellt_am:        string;
  aktualisiert_am:    string;
  // Telegram-Verknüpfung (siehe sql/026_customer_telegram.sql)
  telegram_chat_id?:       number | null;
  telegram_username?:      string | null;
  telegram_link_token?:    string | null;
  telegram_verknuepft_am?: string | null;
  telegram_notifications_aktiv?: boolean;
}

export interface CartItem {
  produkt_id:    string;
  slug:          string;
  name:          string;
  bild_url:      string | null;
  einzelpreis_cents: number;
  menge:         number;
  tax_rate:      number;     // 19, 20, 0
  tax_exempt:    boolean;
  ist_seminar:   boolean;
  max_menge?:    number;     // Lagerbestand
}

export interface Cart {
  items:           CartItem[];
  coupon_code?:    string;
  aktualisiert_am: number;   // Unix ms
}

export interface CartBerechnung {
  subtotal_cents:  number;
  rabatt_cents:    number;
  versand_cents:   number;
  tax_total_cents: number;
  total_cents:     number;
  /** Steuer pro Satz aufgeschlüsselt (für Rechnung) */
  tax_breakdown:   Record<string, { netto_cents: number; tax_cents: number }>;
}

export interface Order {
  id:                  string;
  order_number:        number;
  customer_id:         string | null;
  customer_email:      string;
  customer_name:       string | null;
  status:              OrderStatus;
  subtotal_cents:      number;
  rabatt_cents:        number;
  versand_cents:       number;
  tax_total_cents:     number;
  total_cents:         number;
  waehrung:            string;
  billing_address:     Address;
  shipping_address:    Address;
  versandart:          string | null;
  coupon_id:           string | null;
  coupon_code_snapshot: string | null;
  customer_type_snapshot: CustomerType;
  reverse_charge:      boolean;
  ust_id_snapshot:     string | null;
  // KZ-Snapshots (sql/009)
  iin_snapshot?:       string | null;
  bin_snapshot?:       string | null;
  // Multi-Provider Payment (sql/025)
  payment_method?:     PaymentMethod | null;
  payment_status?:     PaymentStatus;
  payment_meta?:       Record<string, unknown>;
  payment_reference?:  string | null;
  anzahlung_cents?:    number | null;
  anzahlung_bezahlt_am?: string | null;
  // Provider-spezifisch
  kaspi_payment_id?:   string | null;
  kaspi_qr_url?:       string | null;
  stripe_session_id:   string | null;
  stripe_payment_intent: string | null;
  /** Zufalls-Token gegen IDOR auf Zahlungs-Endpunkten (Migration 038). */
  checkout_token?:     string | null;
  bezahlt_am:          string | null;
  versendet_am:        string | null;
  tracking_nummer:     string | null;
  tracking_url:        string | null;
  storniert_am:        string | null;
  storniert_grund:     string | null;
  interne_notiz:       string | null;
  kunden_notiz:        string | null;
  erstellt_am:         string;
  aktualisiert_am:     string;
  items?:              OrderItem[];
}

export interface OrderItem {
  id:                string;
  order_id:          string;
  produkt_id:        string | null;
  produkt_name:      string;
  produkt_slug:      string | null;
  produkt_bild_url:  string | null;
  menge:             number;
  einzelpreis_cents: number;
  rabatt_cents:      number;
  tax_rate:          number;
  tax_amount_cents:  number;
  tax_exempt:        boolean;
  zeile_total_cents: number;
}

export interface Coupon {
  id:               string;
  code:             string;
  beschreibung:     string | null;
  typ:              CouponTyp;
  wert:             number;
  min_bestellwert_cent: number;
  max_rabatt_cent:  number | null;
  nutzungen_max:    number | null;
  nutzungen_pro_user: number;
  nutzungen_aktuell: number;
  gueltig_ab:       string | null;
  gueltig_bis:      string | null;
  aktiv:            boolean;
  nur_b2b:          boolean;
  nur_b2c:          boolean;
  nur_neue_kunden:  boolean;
  erstellt_am:      string;
}

export interface CouponValidierungsErgebnis {
  ok:       boolean;
  fehler?:  string;
  coupon?:  Coupon;
  rabatt_cents?: number;
}
