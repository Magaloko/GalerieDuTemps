// ---------------------------------------------------------------------------
// Produkt-Typen (spiegeln sebo.* DB-Schema wider)
// ---------------------------------------------------------------------------

export type Zustand = "sehr_gut" | "gut" | "akzeptabel" | "restauriert";

export interface Produktbild {
  id:            string;
  produkt_id:    string;
  url:           string;
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
  name:         string;
  slug:         string;
  beschreibung: string | null;
  eltern_id:    number | null;
  bild_url:     string | null;
  sortierung:   number;
  aktiv:        boolean;
  anzahl?:      number;  // Produktanzahl (aus JOIN)
}

export interface Produkt {
  id:                 string;
  name:               string;
  slug:               string;
  artikel_code:       string | null;
  beschreibung:       string | null;
  kurzbeschreibung:   string | null;
  preis:              number;
  originalpreis:      number | null;
  waehrung:           string;
  kategorie_id:       number | null;
  kategorie_name?:    string | null;
  zustand:            Zustand;
  era:                string | null;
  herkunft:           string | null;
  material:           string | null;
  abmessungen:        Abmessungen | null;
  lagerbestand:       number;
  verkauft:           boolean;
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
  // Relations
  bilder?:            Produktbild[];
  hauptbild_url?:     string | null;
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
  preis:           number;
  originalpreis:   number | null;
  kategorie_name:  string | null;
  zustand:         Zustand;
  b2c_mode?:       "visible" | "teaser" | "hidden";
  lagerbestand:    number;
  verkauft:        boolean;
  featured:        boolean;
  hauptbild_url:   string | null;
  erstellt_am:     string;
}

export interface PaginierteProdukte {
  items:       ProduktListItem[];
  gesamt:      number;
  seite:       number;
  limit:       number;
  seiten:      number;
}
