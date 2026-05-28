/**
 * Preis-Parser für Telegram-Foto-Captions (Produkt-Schnellanlage).
 *
 * Eigenes Mini-Modul ohne schwere Imports (kein sharp / DB), damit es pur
 * unit-testbar bleibt. Wird von produkt-erstellung.ts verwendet.
 *
 * Liest aus einer Caption-Zeile einen KZT-Preis (ganzzahlig, keine Nachkomma).
 * Akzeptiert u.a.:
 *   "45000" · "45 000" · "45.000" · "45000₸" · "45 000 тг" · "45000 тенге"
 *   "Цена: 45000" · "цена 45 000 ₸" · "стоимость — 45000"
 * Gibt null zurück, wenn die Zeile kein plausibler Preis ist (>1, < 100 Mrd) —
 * so wird z.B. eine Epoche-Zeile wie "1970-е" NICHT als Preis missverstanden.
 */
const WAEHRUNG_RE = /(?:₸|тг\.?|тенге|tenge|kzt)/i;
const MARKER_RE   = /(?:цена|стоимость|price|preis)/i;

/**
 * True, wenn die Zeile den Preis EXPLIZIT markiert — entweder per Währung
 * (₸ / тг / тенге / kzt) oder Schlüsselwort (Цена / стоимость / price / preis).
 * Eine NACKTE Zahl (z.B. eine Jahreszahl wie „1950") gilt NICHT als markiert.
 *
 * Wird genutzt, um die Auto-Veröffentlichung abzusichern: nur ein klar
 * markierter Preis schaltet ein Stück live; eine bloße Zahl bleibt Entwurf.
 */
export function preisHatMarker(zeile: string): boolean {
  const s = zeile.trim();
  return MARKER_RE.test(s) || WAEHRUNG_RE.test(s);
}

export function parsePreis(zeile: string): number | null {
  const s = zeile.trim();
  if (!s) return null;

  // (a) Mit explizitem Marker (Цена/стоимость/price/preis), oder
  const markerMatch = s.match(/(?:цена|стоимость|price|preis)\s*[:=–—-]?\s*([\d][\d\s.,'`]*)/i);
  // (b) reine Zahl-Zeile mit optionalem Währungssuffix.
  const pureMatch   = s.match(/^([\d][\d\s.,'`]*)\s*(?:₸|тг\.?|тенге|tenge|kzt|t)?\.?$/i);

  const roh = markerMatch?.[1] ?? pureMatch?.[1];
  if (!roh) return null;

  // KZT hat keine Nachkommastellen → alle Nicht-Ziffern (Tausender-Trenner) raus.
  const digits = roh.replace(/\D/g, "");
  if (!digits) return null;

  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 1 || n > 100_000_000_000) return null;
  return n;
}
