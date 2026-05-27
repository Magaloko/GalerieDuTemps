/**
 * Generiert einen URL-sicheren Slug aus einem String.
 * Unterstützt:
 *  - Kyrillisch (RU/UA/KZ) → lateinische Transliteration
 *  - Deutsche Umlaute (ä → ae, ö → oe, ü → ue, ß → ss)
 *  - Französische Akzente (é/è/ê → e, à/â → a)
 *  - Alles andere Nicht-[a-z0-9] wird entfernt.
 *
 * Wenn der Input vollständig aus nicht-konvertierbaren Zeichen besteht
 * (z.B. Chinesisch, Emoji), wird ein Fallback "produkt-XXXXXX" zurückgegeben.
 */

const KYRILLIC_MAP: Record<string, string> = {
  а: "a",  б: "b",  в: "v",  г: "g",  д: "d",  е: "e",  ё: "yo",
  ж: "zh", з: "z",  и: "i",  й: "y",  к: "k",  л: "l",  м: "m",
  н: "n",  о: "o",  п: "p",  р: "r",  с: "s",  т: "t",  у: "u",
  ф: "f",  х: "h",  ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "",   ы: "y",  ь: "",   э: "e",  ю: "yu", я: "ya",
  // Kasachisch
  ә: "a",  ғ: "g",  қ: "k",  ң: "n",  ө: "o",  ұ: "u",  ү: "u",  һ: "h",  і: "i",
};

function transliterateKyrillic(input: string): string {
  let out = "";
  for (const ch of input) {
    out += KYRILLIC_MAP[ch] ?? ch;
  }
  return out;
}

export function generateSlug(input: string): string {
  const base = transliterateKyrillic(input.toLowerCase())
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/é|è|ê|ë/g, "e")
    .replace(/à|á|â|ã/g, "a")
    .replace(/í|ì|î|ï/g, "i")
    .replace(/ó|ò|ô|õ/g, "o")
    .replace(/ú|ù|û/g, "u")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c")
    // Bug-Fix: Underscore MUSS in der Whitelist bleiben, sonst entfernt
    // dieser Regex ihn bevor der nächste Schritt ihn zu Hyphen umwandeln
    // kann. Vorher: 'my_product' → 'myproduct' statt 'my-product'.
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);

  // Fallback wenn Input vollständig aus nicht-konvertierbaren Zeichen bestand
  return base || `produkt-${Math.random().toString(36).slice(2, 8)}`;
}

/** Fügt Timestamp-Suffix an, um Kollisionen zu vermeiden */
export function uniqueSlug(base: string): string {
  const slug = generateSlug(base);
  const suffix = Date.now().toString(36).slice(-4);
  return `${slug}-${suffix}`;
}
