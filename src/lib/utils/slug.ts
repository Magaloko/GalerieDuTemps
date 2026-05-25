/**
 * Generiert einen URL-sicheren Slug aus einem String
 * Unterstützt deutsche Umlaute und Sonderzeichen
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/é|è|ê/g, "e")
    .replace(/à|â/g, "a")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 200);
}

/** Fügt Timestamp-Suffix an, um Kollisionen zu vermeiden */
export function uniqueSlug(base: string): string {
  const slug = generateSlug(base);
  const suffix = Date.now().toString(36).slice(-4);
  return `${slug}-${suffix}`;
}
