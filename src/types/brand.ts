// ---------------------------------------------------------------------------
// Brand-Typen (spiegeln sebo.brands wider — sql/061_brands.sql).
//
// Eine Marke bündelt Produkte / Journal / Instagram / Landing-Pages und hat
// einen optionalen Intro-Block-Bereich (LandingBlock[], wie Landing-Pages) +
// eine Video-Liste. Textfelder mehrsprachig (I18nText, Fallback-Kette
// ru→en→de via blockText / i18n).
// ---------------------------------------------------------------------------

import type { I18nText } from "./produkt";
import type { LandingBlock } from "./landing";

export type { I18nText };

/** Ein eingebettetes Brand-Video (YouTube/Vimeo/MP4). */
export interface BrandVideo {
  url: string;
  titel?: string;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  /** Mehrsprachige Beschreibung {ru,en,de}. */
  beschreibung: I18nText;
  /** Eingebettete Videos (YouTube/Vimeo/MP4). */
  videos: BrandVideo[];
  /** Optionaler Design-Bereich oben auf der Brand-Page (Block-Builder). */
  intro_blocks: LandingBlock[];
  aktiv: boolean;
  sortierung: number;
  seo_titel: string | null;
  seo_beschreibung: string | null;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

/** Reduzierte Brand-Zeile für Selects/Listen. */
export interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  aktiv: boolean;
}
