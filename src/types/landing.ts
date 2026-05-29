// ---------------------------------------------------------------------------
// Landing-Page-Typen (spiegeln sebo.landing_pages wider)
//
// Block-basierter Landing-Page-Builder — analog zu ProduktBlock / NewsletterBlock.
// Textfelder sind mehrsprachig (I18nText, Fallback-Kette ru→en→de via blockText).
// ---------------------------------------------------------------------------

import type { I18nText } from "./produkt";

export type { I18nText };

export type LandingStatus = "entwurf" | "veroeffentlicht" | "archiviert";

export type LandingBlockType =
  | "hero"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "product_grid"
  | "gallery"
  | "video"
  | "testimonial"
  | "faq"
  | "cta_band";

/** Quelle für den product_grid-Block. */
export type ProductGridQuelle = "featured" | "kategorie" | "slugs";

/**
 * Polymorpher Landing-Block. Nicht jedes Feld ist für jeden Typ relevant —
 * der Renderer und der Editor verwenden nur die jeweils passenden Felder.
 * Textfelder mehrsprachig (I18nText); URLs/Keys sprachneutral.
 */
export interface LandingBlock {
  type: LandingBlockType;

  /** Block-Hintergrund (Key aus STORY_BG; "standard"/leer = ohne). */
  bg?: string;
  /** Text-Ausrichtung (hero/text/cta_band). */
  align?: "left" | "center" | "right";

  // ── Textfelder (mehrsprachig) ──────────────────────────────────────────
  /** hero/cta_band/testimonial: Überschrift · faq: (ungenutzt). */
  titel?: I18nText;
  /** hero: Untertitel. */
  subtitel?: I18nText;
  /** text: Fließtext (\n\n = Absatz). */
  text?: I18nText;
  /** button/hero/cta_band: CTA-Beschriftung. */
  cta_label?: I18nText;
  /** image/gallery: Bildunterschrift. */
  caption?: I18nText;
  /** testimonial: Zitat. */
  quote?: I18nText;
  /** testimonial: Autor/Quelle. */
  autor?: I18nText;
  /** faq: Frage. */
  frage?: I18nText;
  /** faq: Antwort. */
  antwort?: I18nText;

  // ── Sprachneutrale Felder ──────────────────────────────────────────────
  /** hero/image: Bild- oder Video-Hintergrund-URL. */
  bild_url?: string;
  /** gallery: mehrere Bild-URLs. */
  bild_urls?: string[];
  /** video: Embed-/Datei-URL (YouTube/Vimeo/.mp4). */
  video_url?: string;
  /** button/hero/cta_band: CTA-Ziel-URL (intern /… oder extern https://…). */
  cta_url?: string;

  // ── product_grid ───────────────────────────────────────────────────────
  /** product_grid: Datenquelle. */
  quelle?: ProductGridQuelle;
  /** product_grid (quelle=slugs): explizite Produkt-Slugs. */
  produkt_slugs?: string[];
  /** product_grid (quelle=kategorie): Kategorie-Slug. */
  kategorie_slug?: string;
  /** product_grid: maximale Anzahl Karten. */
  limit?: number;
}

export interface LandingPage {
  id: string;
  slug: string;
  titel: string;
  status: LandingStatus;
  blocks: LandingBlock[];
  ist_startseite: boolean;
  seo_titel: string | null;
  seo_beschreibung: string | null;
  brand_id: string | null;
  erstellt_am?: string;
  aktualisiert_am?: string;
}
