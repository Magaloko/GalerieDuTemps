/**
 * Instagram-URL-Helper.
 *
 * Aufgaben:
 *   1. extractInstagramUrl(raw)   — User pastet URL oder ganzes <blockquote>-HTML.
 *                                    Extrahiert die kanonische Permalink-URL daraus.
 *   2. isValidInstagramUrl(url)   — Format-Check.
 *   3. instagramShortcode(url)    — Extract shortcode (für Cache-Keys, Analytics).
 */

const INSTAGRAM_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i;

/** Kanonisiert eine IG-URL: ohne Query-String, mit Trailing-Slash. */
function canonicalize(matched: string): string {
  const m = matched.match(INSTAGRAM_URL_RE);
  if (!m) return matched;
  const typ       = m[2].toLowerCase().replace("reels", "reel");
  const shortcode = m[3];
  return `https://www.instagram.com/${typ}/${shortcode}/`;
}

/**
 * Extrahiert eine Instagram-Permalink-URL aus:
 *   - einer einfachen URL ("https://www.instagram.com/reel/ABC/...")
 *   - dem kompletten <blockquote class="instagram-media" data-instgrm-permalink="..."> Embed-HTML
 *
 * Returns null wenn nichts erkannt.
 */
export function extractInstagramUrl(raw: string): string | null {
  if (!raw) return null;
  const input = raw.trim();

  // 1. data-instgrm-permalink="..." aus Embed-HTML
  const permaMatch = input.match(/data-instgrm-permalink=["']([^"']+)["']/i);
  if (permaMatch) {
    return canonicalize(permaMatch[1]);
  }

  // 2. Erste Instagram-URL im Text finden
  const urlMatch = input.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[a-zA-Z0-9_-]+\/?/i);
  if (urlMatch) {
    return canonicalize(urlMatch[0]);
  }

  return null;
}

/** True wenn url eine gültige IG-Permalink-URL ist. */
export function isValidInstagramUrl(url: string): boolean {
  return INSTAGRAM_URL_RE.test(url);
}

/** Extrahiert den Shortcode (z.B. "DYsTivPCWiF") aus einer kanonischen URL. */
export function instagramShortcode(url: string): string | null {
  const m = url.match(INSTAGRAM_URL_RE);
  return m ? m[3] : null;
}

/** Type: "p" (post) | "reel" | "tv" */
export function instagramTyp(url: string): "p" | "reel" | "tv" | null {
  const m = url.match(INSTAGRAM_URL_RE);
  if (!m) return null;
  const t = m[2].toLowerCase().replace("reels", "reel");
  return (t as "p" | "reel" | "tv");
}
