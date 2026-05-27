import { describe, it, expect } from "vitest";
import { generateSlug, uniqueSlug } from "../utils/slug";

/**
 * Tests für Slug-Generation.
 *
 * Kritisch weil Slugs URL-Paths sind — kaputter Slug = 404. Vintage-Möbel
 * haben oft Sonderzeichen, Umlaute, Akzente, Cyrillic (KZ-Markt).
 */

describe("generateSlug", () => {
  // ── Latin Basis ─────────────────────────────────────────────────────────
  it("einfacher ASCII-Text", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("trimmt Whitespace + collapse multiple spaces", () => {
    expect(generateSlug("  Hello    World  ")).toBe("hello-world");
  });

  it("underscores → hyphens", () => {
    expect(generateSlug("my_product_name")).toBe("my-product-name");
  });

  it("multiple hyphens → single hyphen", () => {
    expect(generateSlug("a---b")).toBe("a-b");
  });

  it("trim hyphens am Anfang und Ende", () => {
    expect(generateSlug("-hello-")).toBe("hello");
  });

  // ── Deutsche Umlaute ────────────────────────────────────────────────────
  it("ä → ae", () => {
    expect(generateSlug("Käfer")).toBe("kaefer");
  });

  it("alle Umlaute + ß", () => {
    expect(generateSlug("Wäschestück mit Größe Öl")).toBe("waeschestueck-mit-groesse-oel");
  });

  it("Vintage-DE Beispiel: 'Wiener Caféhaus-Stuhl'", () => {
    expect(generateSlug("Wiener Caféhaus-Stuhl")).toBe("wiener-cafehaus-stuhl");
  });

  // ── Französische Akzente ────────────────────────────────────────────────
  it("é/è/ê/ë alle → e", () => {
    expect(generateSlug("été crème mêler Noël")).toBe("ete-creme-meler-noel");
  });

  it("Vintage-FR Beispiel: 'Art Déco Tischlampe'", () => {
    expect(generateSlug("Art Déco Tischlampe")).toBe("art-deco-tischlampe");
  });

  it("á/à/â/ã/í/ì/î/ï/ó/ò/ô/õ/ú/ù/û/ñ/ç alle korrekt", () => {
    expect(generateSlug("à á â ã í ì î ï ó ò ô õ ú ù û ñ ç")).toBe(
      "a-a-a-a-i-i-i-i-o-o-o-o-u-u-u-n-c"
    );
  });

  // ── Russisch / Kyrillisch ───────────────────────────────────────────────
  it("Russisch: einfaches Wort", () => {
    expect(generateSlug("привет")).toBe("privet");
  });

  it("Russisch: Vintage-Möbel-Name 'Жемчуг Акойя класса ААА'", () => {
    // Korrekte erwartete Transliteration:
    // Ж=zh, е=e, м=m, ч=ch, у=u, г=g, ' ', А=a, к=k, о=o, й=y, я=ya, ' '
    // к=k, л=l, а=a, с=s, с=s, а=a, ' ', А=a, А=a, А=a
    expect(generateSlug("Жемчуг Акойя класса ААА")).toBe("zhemchug-akoyya-klassa-aaa");
  });

  it("Russisch: spezielle Buchstaben (ё, щ, ъ, ы, ь, э, ю, я)", () => {
    expect(generateSlug("ёлка")).toBe("yolka");
    expect(generateSlug("щука")).toBe("schuka");
    expect(generateSlug("объект")).toBe("obekt");   // ъ → ""
    expect(generateSlug("сыр")).toBe("syr");
    expect(generateSlug("эхо")).toBe("eho");
    expect(generateSlug("юг")).toBe("yug");
    expect(generateSlug("ящик")).toBe("yaschik");
  });

  // ── Kasachisch ──────────────────────────────────────────────────────────
  it("Kasachische Spezial-Buchstaben (ә, ғ, қ, ң, ө, ұ, ү, һ, і)", () => {
    // Beispiel: типичные KZ-Buchstaben in einem Wort
    // ә=a, ғ=g, қ=k, ң=n, ө=o, ұ=u, ү=u, һ=h, і=i
    expect(generateSlug("Қазақстан")).toBe("kazakstan");
    expect(generateSlug("Алматы")).toBe("almaty");
  });

  // ── Mixed-Language / Edge ───────────────────────────────────────────────
  it("Mix DE+RU+EN", () => {
    expect(generateSlug("Möbel мебель furniture")).toBe("moebel-mebel-furniture");
  });

  it("entfernt unbekannte Symbole (Emoji, Mathe)", () => {
    expect(generateSlug("Hello 🎉 World ∑")).toBe("hello-world");
  });

  it("leerer String → Fallback 'produkt-XXXXXX'", () => {
    const slug = generateSlug("");
    expect(slug).toMatch(/^produkt-[a-z0-9]{6}$/);
  });

  it("nur Sonderzeichen → Fallback", () => {
    const slug = generateSlug("!!!@@@###");
    expect(slug).toMatch(/^produkt-[a-z0-9]{6}$/);
  });

  it("nur Emoji → Fallback", () => {
    const slug = generateSlug("🎉🌟🎈");
    expect(slug).toMatch(/^produkt-[a-z0-9]{6}$/);
  });

  it("Chinesisch (nicht transliteriert) → Fallback", () => {
    const slug = generateSlug("你好世界");
    expect(slug).toMatch(/^produkt-[a-z0-9]{6}$/);
  });

  // ── Längen-Limit ────────────────────────────────────────────────────────
  it("Sehr langer Input wird auf 200 Zeichen abgeschnitten", () => {
    const longName = "a".repeat(300);
    const slug = generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(200);
    expect(slug).toMatch(/^a+$/);  // alles 'a'
  });

  // ── Zahlen + Mixed ──────────────────────────────────────────────────────
  it("erhält Zahlen", () => {
    expect(generateSlug("Stuhl 1965")).toBe("stuhl-1965");
  });

  it("Großbuchstaben → kleinbuchstaben", () => {
    expect(generateSlug("UPPERCASE")).toBe("uppercase");
  });
});

describe("uniqueSlug", () => {
  it("liefert Slug mit Suffix-Format <base>-<4chars>", () => {
    const slug = uniqueSlug("Test Product");
    expect(slug).toMatch(/^test-product-[a-z0-9]{4}$/);
  });

  it("2 Aufrufe direkt hintereinander liefern (meist) unterschiedliche Slugs", () => {
    // Da Suffix aus Date.now() abgeleitet ist, brauchen wir Zeit zwischen Calls.
    // Schnelle Aufrufe innerhalb 1 ms können denselben Suffix haben — das ist
    // erwartet (uniqueSlug ist nur "wahrscheinlich unique", für echte
    // Eindeutigkeit muss DB-CHECK ergänzt werden, siehe produkte.ts).
    const s1 = uniqueSlug("foo");
    const s2 = uniqueSlug("foo");
    // Format sollte gleich sein
    expect(s1).toMatch(/^foo-[a-z0-9]{4}$/);
    expect(s2).toMatch(/^foo-[a-z0-9]{4}$/);
  });

  it("respektiert generateSlug-Transformation auf der Base", () => {
    const slug = uniqueSlug("Käfer Möbel");
    expect(slug).toMatch(/^kaefer-moebel-[a-z0-9]{4}$/);
  });
});
