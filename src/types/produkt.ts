// ---------------------------------------------------------------------------
// Produkt-Typen (spiegeln sebo.* DB-Schema wider)
// ---------------------------------------------------------------------------

export type Zustand = "sehr_gut" | "gut" | "akzeptabel" | "restauriert";

// ---------------------------------------------------------------------------
// Story-Blöcke (block-basierte Produktbeschreibung, wie im Newsletter-Editor)
// ---------------------------------------------------------------------------
export type ProduktBlockTyp =
  | "heading" | "text" | "image" | "highlight" | "quote"
  | "divider" | "button" | "columns" | "gallery";

export interface ProduktBlock {
  type:     ProduktBlockTyp;
  /** heading/text/highlight/quote: Textinhalt · columns: linke Spalte. */
  text?:    string;
  /** columns: rechte Spalte. */
  text2?:   string;
  /** image: Bild-URL. */
  bild_url?: string;
  /** gallery: mehrere Bild-URLs (Grid). */
  bilder?:  string[];
  /** image: Bildunterschrift · quote: Urheber/Quelle. */
  caption?: string;
  /** button: Beschriftung. */
  label?:   string;
  /** button: Ziel-URL (intern /… oder extern https://…). */
  url?:     string;
}

export interface Produktbild {
  id:            string;
  produkt_id:    string;
  /** Original-URL (komprimiert). Immer gesetzt. */
  url:           string;
  /** 400px WebP für Galerie-Grid. NULL für Legacy-Bilder (vor sql/030). */
  url_thumb:     string | null;
  /** 800px WebP für Produkt-Detail. NULL für Legacy-Bilder. */
  url_medium:    string | null;
  /** 1600px WebP für Zoom/Lightbox. NULL für Legacy-Bilder. */
  url_large:     string | null;
  /** Original-Format: jpeg/png/webp/avif/heif. NULL für Legacy. */
  format:        string | null;
  alt_text:      string | null;
  sortierung:    number;
  ist_hauptbild: boolean;
  breite:        number | null;
  hoehe:         number | null;
  dateigroesse:  number | null;
  erstellt_am:   string;
}

export interface Kategorie {
  id:           number;
  code:         string | null;
  name:         string;
  slug:         string;
  beschreibung: string | null;
  eltern_id:    number | null;
  eltern_name?: string | null;  // aus JOIN
  bild_url:     string | null;
  sortierung:   number;
  aktiv:        boolean;
  anzahl?:      number;
}

export interface Produkt {
  id:                 string;
  name:               string;
  slug:               string;
  artikel_code:       string | null;
  beschreibung:       string | null;
  kurzbeschreibung:   string | null;
  name_i18n:          Record<string, string>;
  kurzbeschreibung_i18n: Record<string, string>;
  beschreibung_i18n:  Record<string, string>;
  preis:              number;
  originalpreis:      number | null;
  einkaufspreis:      number | null;
  b2b_preis:          number | null;
  waehrung:           string;
  kategorie_id:       number | null;
  kategorie_name?:    string | null;
  kategorie_slug?:    string | null;
  zustand:            Zustand;
  era:                string | null;
  herkunft:           string | null;
  material:           string | null;
  abmessungen:        Abmessungen | null;
  lagerbestand:       number;
  verkauft:           boolean;
  /** Reservierung gültig bis (ISO). NULL = nicht reserviert. Server/Admin-only. */
  reserviert_bis:     string | null;
  /** Admin-Kontext: für wen reserviert. NIE öffentlich serialisieren. */
  reserviert_von:     string | null;
  featured:           boolean;
  aktiv:              boolean;
  b2c_mode:           "visible" | "teaser" | "hidden";
  seo_titel:          string | null;
  seo_beschreibung:   string | null;
  tags:               string[];
  meta:               Record<string, unknown>;
  erstellt_am:        string;
  aktualisiert_am:    string;
  veroeffentlicht_am: string | null;
  hauptbild_url:      string | null;
  rueckbild_url:      string | null;
  video_url:          string | null;
  /** Instagram-Permalink-URLs (Posts/Reels/TV) für dieses Produkt. Reihenfolge = Anzeige. */
  instagram_urls:     string[];
  /** Story-Blöcke der Produktseite (leer = Fallback auf beschreibung). */
  inhalt_blocks:      ProduktBlock[];
  // Relations
  bilder?:            Produktbild[];
  dateien?:           Produktdatei[];
  zertifikate?:       Produktzertifikat[];
}

export interface Produktdatei {
  id:           string;
  produkt_id:   string;
  url:          string;
  name:         string;
  dateigroesse: number | null;
  sortierung:   number;
  erstellt_am:  string;
}

export interface Produktzertifikat {
  id:           string;
  produkt_id:   string;
  url:          string;
  name:         string;
  aussteller:   string | null;
  datum:        string | null;
  sortierung:   number;
  erstellt_am:  string;
}

export interface Abmessungen {
  breite?:  number;
  hoehe?:   number;
  tiefe?:   number;
  gewicht?: number;
}

export interface ProduktListItem {
  id:              string;
  name:            string;
  slug:            string;
  artikel_code:    string | null;
  preis:           number;
  originalpreis:   number | null;
  waehrung?:       string;
  kategorie_name:  string | null;
  zustand:         Zustand;
  aktiv:           boolean;
  b2c_mode?:       "visible" | "teaser" | "hidden";
  lagerbestand:    number;
  verkauft:        boolean;
  /** Binär: aktuell reserviert (Frist in der Zukunft, nicht verkauft). */
  reserviert?:     boolean;
  /** Admin-Liste: Reservierungs-Frist (ISO). NUR Admin — nie in Public-Queries selektiert. */
  reserviert_bis?: string | null;
  featured:        boolean;
  hauptbild_url:   string | null;
  erstellt_am:     string;
  // Optional fields für ProduktKarte-Polish (Welle 1):
  // - era       → KeyDetail-Tag (e.g. "1970-е")
  // - material  → Hover-Specs (e.g. "Шёлк")
  // - herkunft  → Hover-Specs (e.g. "Франция")
  // - bilder_count → Image-Count-Indicator (Dots wenn > 1)
  era?:           string | null;
  material?:      string | null;
  herkunft?:      string | null;
  bilder_count?:  number | null;
}

export interface PaginierteProdukte {
  items:       ProduktListItem[];
  gesamt:      number;
  seite:       number;
  limit:       number;
  seiten:      number;
}
