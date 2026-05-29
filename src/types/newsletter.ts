import type { LandingBlock } from "@/types/landing";

export type NewsletterStatus = "entwurf" | "geplant" | "versendet" | "abgebrochen";

export interface NewsletterSubscriber {
  id:                string;
  email:             string;
  vorname:           string | null;
  nachname:          string | null;
  customer_id:       string | null;
  confirmed_am:      string | null;
  unsubscribed_am:   string | null;
  unsubscribe_token: string;
  quelle:            string | null;
  erstellt_am:       string;
}

export type NewsletterBlockType = "hero" | "text" | "produkt" | "button" | "divider" | "two_columns" | "image";

export interface NewsletterBlock {
  type:        NewsletterBlockType;
  titel?:      string;
  subtitel?:   string;
  html?:       string;
  bild_url?:   string;
  cta_label?:  string;
  cta_url?:    string;
  produkt_slug?: string;
  // Two-Columns
  links_html?:  string;
  rechts_html?: string;
  // Button
  label?: string;
  url?:   string;
}

export interface Newsletter {
  id:               string;
  titel:            string;
  betreff:          string;
  preheader:        string | null;
  blocks:           NewsletterBlock[];
  status:           NewsletterStatus;
  segment_id:       string | null;
  versand_zeit:     string | null;
  versendet_am:     string | null;
  empfaenger_anzahl: number;
  geoeffnet_anzahl:  number;
  geklickt_anzahl:   number;
  erstellt_am:      string;
}

export interface JournalPost {
  id:                string;
  titel:             string;
  slug:              string;
  excerpt:           string | null;
  cover_bild_url:    string | null;
  markdown:          string;
  /** Block-Builder-Inhalt (analog Landing-Pages). Leer = Markdown-Fallback. */
  blocks:            LandingBlock[];
  autor_name:        string | null;
  tags:              string[];
  seo_titel:         string | null;
  seo_beschreibung:  string | null;
  veroeffentlicht:   boolean;
  veroeffentlicht_am: string | null;
  aufrufe:           number;
  erstellt_am:       string;
  aktualisiert_am:   string;
}
