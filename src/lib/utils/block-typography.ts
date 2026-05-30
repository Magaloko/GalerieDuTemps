/* ──────────────────────────────────────────────────────────────────────────
 * Block-Typografie — gemeinsame Skala für Schriftgröße & Schriftart.
 *
 * Genutzt von:
 *   • Block-System (LandingBlock): Pages, Journal, Brands, Produkt-Stories
 *     → Web-Rendering mit CSS-Variablen (markenkonform, Theme-fähig).
 *   • Newsletter (NewsletterBlock): E-Mail
 *     → echte px-Werte + Font-Stacks (E-Mail-Clients kennen keine CSS-vars).
 *
 * Bewusst eine **Preset-Skala** (S/M/L/XL) statt freier px-Eingabe: ein
 * Operator/Marketing soll nicht „13.5px" tippen, sondern konsistente,
 * markenkonforme Stufen wählen. Default (undefined) = "m".
 * ────────────────────────────────────────────────────────────────────────── */

export type BlockFontSize   = "s" | "m" | "l" | "xl";
export type BlockFontFamily = "serif" | "sans" | "italic";

export const FONT_SIZES:    readonly BlockFontSize[]   = ["s", "m", "l", "xl"] as const;
export const FONT_FAMILIES: readonly BlockFontFamily[] = ["serif", "sans", "italic"] as const;

/** Editor-Labels (Russisch — Admin-Sprache). */
export const FONT_SIZE_LABEL: Record<BlockFontSize, string> = {
  s:  "S",
  m:  "M",
  l:  "L",
  xl: "XL",
};
export const FONT_FAMILY_LABEL: Record<BlockFontFamily, string> = {
  serif:  "Сериф",
  sans:   "Гротеск",
  italic: "Курсив",
};

export function normFontSize(v: unknown): BlockFontSize {
  return v === "s" || v === "l" || v === "xl" ? v : "m";
}
export function normFontFamily(v: unknown): BlockFontFamily | undefined {
  return v === "serif" || v === "sans" || v === "italic" ? v : undefined;
}

/* ── WEB (CSS-Variablen) ──────────────────────────────────────────────────
 * Body-Skala für Fließtext-Blöcke (text/testimonial/faq/caption). Headlines
 * (hero/cta_band) bleiben bewusst responsiv per clamp() — die regelt das
 * Layout, nicht der Operator.
 */
const WEB_BODY_PX: Record<BlockFontSize, string> = {
  s:  "14px",
  m:  "17px",
  l:  "20px",
  xl: "24px",
};

const WEB_FONT_VAR: Record<BlockFontFamily, string> = {
  serif:  "var(--font-display)",
  sans:   "var(--font-sans)",
  italic: "var(--font-italic)",
};

/**
 * Heading-Skala für Überschriften-Blöcke (hero/cta_band). Bleibt **responsiv**
 * per clamp() — der Operator wählt nur die Stufe, das Layout skaliert weiter
 * mobil↔desktop, damit XL auf dem Handy nicht überläuft.
 */
const WEB_HEADING_CLAMP: Record<BlockFontSize, string> = {
  s:  "clamp(1.5rem, 4vw, 2.25rem)",
  m:  "clamp(2rem, 6vw, 3.75rem)",   // = bisheriger Hero-Default
  l:  "clamp(2.5rem, 7vw, 4.5rem)",
  xl: "clamp(3rem, 8.5vw, 5.5rem)",
};

/**
 * Inline-Style für ein Web-Text-Element. `base` ist die Default-Größe des
 * jeweiligen Blocks (z. B. "17px"), die genutzt wird wenn keine Größe gesetzt
 * ist — so bleibt die bestehende Optik erhalten, bis der Operator etwas wählt.
 */
export function webTextStyle(
  size?: BlockFontSize,
  family?: BlockFontFamily,
  base?: string,
): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (size)        style.fontSize = WEB_BODY_PX[size];
  else if (base)   style.fontSize = base;
  if (family) {
    style.fontFamily = WEB_FONT_VAR[family];
    style.fontStyle  = family === "italic" ? "italic" : "normal";
  }
  return style;
}

/**
 * Wie webTextStyle, aber mit der responsiven Heading-Skala für Überschriften.
 * Ohne gesetzte Größe wird `base` (der Block-Default-Clamp) beibehalten.
 */
export function webHeadingStyle(
  size?: BlockFontSize,
  family?: BlockFontFamily,
  base?: string,
): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (size)        style.fontSize = WEB_HEADING_CLAMP[size];
  else if (base)   style.fontSize = base;
  if (family) {
    style.fontFamily = WEB_FONT_VAR[family];
    style.fontStyle  = family === "italic" ? "italic" : "normal";
  }
  return style;
}

/* ── E-MAIL (px + echte Font-Stacks) ──────────────────────────────────────
 * Keine CSS-Variablen — Outlook/Gmail rendern die nicht. Werte spiegeln das
 * Marken-CSS: Playfair (serif) / Inter (sans) / Georgia-Italic.
 */
const MAIL_SIZE_PX: Record<BlockFontSize, string> = {
  s:  "13px",
  m:  "15px",
  l:  "18px",
  xl: "22px",
};
const MAIL_FONT_STACK: Record<BlockFontFamily, string> = {
  serif:  '"Playfair Display", Georgia, serif',
  sans:   '"Inter", system-ui, -apple-system, sans-serif',
  italic: 'Georgia, "Times New Roman", serif',
};

/**
 * Liefert die zu mergenden inline-CSS-Fragmente für E-Mail-HTML.
 * `baseFamily`/`baseSize` = bestehende Defaults des Blocks (Fallback).
 */
export function mailTextCss(
  size: BlockFontSize | undefined,
  family: BlockFontFamily | undefined,
  baseFamily: string,
  baseSize: string,
): string {
  const sizePx = size ? MAIL_SIZE_PX[size] : baseSize;
  const stack  = family ? MAIL_FONT_STACK[family] : baseFamily;
  const italic = family === "italic" ? "font-style: italic;" : "";
  return `font-family: ${stack}; font-size: ${sizePx}; ${italic}`;
}
