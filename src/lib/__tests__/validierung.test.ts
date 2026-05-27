import { describe, it, expect } from "vitest";
import { ProduktCreateSchema, KategorieCreateSchema, BildUpdateSchema, PaginierungSchema } from "../utils/validierung";

/**
 * Tests für Zod-Schemas — sichern Validation-Bedingungen für Forms + APIs.
 */

describe("ProduktCreateSchema", () => {
  const minimal = { name: "Test", preis: 100 };

  it("akzeptiert minimal-valid (nur name + preis)", () => {
    const r = ProduktCreateSchema.safeParse(minimal);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.zustand).toBe("gut");        // Default
      expect(r.data.lagerbestand).toBe(1);       // Default
      expect(r.data.waehrung).toBe("KZT");       // Default
      expect(r.data.aktiv).toBe(true);
      expect(r.data.b2c_mode).toBe("visible");
    }
  });

  it("rejected name kürzer als 2 Zeichen", () => {
    const r = ProduktCreateSchema.safeParse({ name: "A", preis: 100 });
    expect(r.success).toBe(false);
  });

  it("rejected name länger als 300", () => {
    const r = ProduktCreateSchema.safeParse({ name: "A".repeat(301), preis: 100 });
    expect(r.success).toBe(false);
  });

  it("rejected negativer Preis", () => {
    const r = ProduktCreateSchema.safeParse({ name: "Test", preis: -10 });
    expect(r.success).toBe(false);
  });

  it("rejected Preis = 0", () => {
    const r = ProduktCreateSchema.safeParse({ name: "Test", preis: 0 });
    expect(r.success).toBe(false);
  });

  it("akzeptiert Preis als String (coerce)", () => {
    const r = ProduktCreateSchema.safeParse({ name: "Test", preis: "1500" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.preis).toBe(1500);
  });

  it("rejected ungültiges zustand-Enum", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, zustand: "perfekt" });
    expect(r.success).toBe(false);
  });

  it("akzeptiert alle 4 zustand-Werte", () => {
    for (const z of ["sehr_gut", "gut", "akzeptabel", "restauriert"] as const) {
      const r = ProduktCreateSchema.safeParse({ ...minimal, zustand: z });
      expect(r.success).toBe(true);
    }
  });

  it("rejected ungültiges b2c_mode", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, b2c_mode: "secret" });
    expect(r.success).toBe(false);
  });

  it("tags als String wird zu Array gesplittet", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, tags: "vintage, möbel, 1960" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tags).toEqual(["vintage", "möbel", "1960"]);
  });

  it("tags als Array bleibt Array", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, tags: ["a", "b"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tags).toEqual(["a", "b"]);
  });

  it("leere tags-String → leeres Array (nicht ['']) ", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, tags: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tags).toEqual([]);
  });

  it("kategorie_id muss positive integer sein", () => {
    expect(ProduktCreateSchema.safeParse({ ...minimal, kategorie_id: 0 }).success).toBe(false);
    expect(ProduktCreateSchema.safeParse({ ...minimal, kategorie_id: -1 }).success).toBe(false);
    expect(ProduktCreateSchema.safeParse({ ...minimal, kategorie_id: 1.5 }).success).toBe(false);
    expect(ProduktCreateSchema.safeParse({ ...minimal, kategorie_id: 5 }).success).toBe(true);
  });

  it("lagerbestand kann 0 sein (verkauft)", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, lagerbestand: 0 });
    expect(r.success).toBe(true);
  });

  it("lagerbestand rejected negativ", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, lagerbestand: -5 });
    expect(r.success).toBe(false);
  });

  it("waehrung muss exakt 3 Zeichen sein", () => {
    expect(ProduktCreateSchema.safeParse({ ...minimal, waehrung: "EU" }).success).toBe(false);
    expect(ProduktCreateSchema.safeParse({ ...minimal, waehrung: "EURO" }).success).toBe(false);
    expect(ProduktCreateSchema.safeParse({ ...minimal, waehrung: "EUR" }).success).toBe(true);
  });

  it("seo_titel max 70", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, seo_titel: "x".repeat(71) });
    expect(r.success).toBe(false);
  });

  it("seo_beschreibung max 160", () => {
    const r = ProduktCreateSchema.safeParse({ ...minimal, seo_beschreibung: "x".repeat(161) });
    expect(r.success).toBe(false);
  });

  it("abmessungen mit allen 4 Feldern", () => {
    const r = ProduktCreateSchema.safeParse({
      ...minimal,
      abmessungen: { breite: 90, hoehe: 75, tiefe: 50, gewicht: 12.5 },
    });
    expect(r.success).toBe(true);
  });

  it("abmessungen mit nur einem Feld", () => {
    const r = ProduktCreateSchema.safeParse({
      ...minimal,
      abmessungen: { hoehe: 100 },
    });
    expect(r.success).toBe(true);
  });

  it("abmessungen rejected negative Werte", () => {
    const r = ProduktCreateSchema.safeParse({
      ...minimal,
      abmessungen: { breite: -10 },
    });
    expect(r.success).toBe(false);
  });

  it("name_i18n als Record<string,string> akzeptiert", () => {
    const r = ProduktCreateSchema.safeParse({
      ...minimal,
      name_i18n: { ru: "Стол", en: "Table", de: "Tisch" },
    });
    expect(r.success).toBe(true);
  });
});

describe("KategorieCreateSchema", () => {
  it("akzeptiert minimal", () => {
    expect(KategorieCreateSchema.safeParse({ name: "Möbel" }).success).toBe(true);
  });

  it("rejected name unter 2 Zeichen", () => {
    expect(KategorieCreateSchema.safeParse({ name: "M" }).success).toBe(false);
  });

  it("bild_url muss valide URL sein", () => {
    expect(KategorieCreateSchema.safeParse({ name: "Test", bild_url: "not-a-url" }).success).toBe(false);
    expect(KategorieCreateSchema.safeParse({ name: "Test", bild_url: "https://example.com/img.jpg" }).success).toBe(true);
  });

  it("eltern_id muss positive int sein", () => {
    expect(KategorieCreateSchema.safeParse({ name: "Test", eltern_id: 0 }).success).toBe(false);
    expect(KategorieCreateSchema.safeParse({ name: "Test", eltern_id: 1 }).success).toBe(true);
  });

  it("sortierung default 0", () => {
    const r = KategorieCreateSchema.safeParse({ name: "Test" });
    if (r.success) expect(r.data.sortierung).toBe(0);
  });
});

describe("BildUpdateSchema", () => {
  it("alt_text max 200", () => {
    expect(BildUpdateSchema.safeParse({ alt_text: "x".repeat(201) }).success).toBe(false);
    expect(BildUpdateSchema.safeParse({ alt_text: "Beschreibung" }).success).toBe(true);
  });

  it("sortierung muss non-negative int", () => {
    expect(BildUpdateSchema.safeParse({ sortierung: -1 }).success).toBe(false);
    expect(BildUpdateSchema.safeParse({ sortierung: 0 }).success).toBe(true);
    expect(BildUpdateSchema.safeParse({ sortierung: 1.5 }).success).toBe(false);
  });

  it("alle Felder optional", () => {
    expect(BildUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("PaginierungSchema", () => {
  it("defaults: seite=1, limit=20, sortierung=erstellt_am", () => {
    const r = PaginierungSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.seite).toBe(1);
      expect(r.data.limit).toBe(20);
      expect(r.data.sortierung).toBe("erstellt_am");
    }
  });

  it("limit max 100", () => {
    expect(PaginierungSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(PaginierungSchema.safeParse({ limit: 100 }).success).toBe(true);
  });

  it("limit min 1", () => {
    expect(PaginierungSchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it("seite min 1", () => {
    expect(PaginierungSchema.safeParse({ seite: 0 }).success).toBe(false);
  });

  it("akzeptiert alle 4 sortierung-Werte", () => {
    for (const s of ["erstellt_am", "preis_asc", "preis_desc", "name"] as const) {
      expect(PaginierungSchema.safeParse({ sortierung: s }).success).toBe(true);
    }
  });

  it("rejected unbekannte sortierung", () => {
    expect(PaginierungSchema.safeParse({ sortierung: "popularity" }).success).toBe(false);
  });

  it("coerce: limit als String wird zu number", () => {
    const r = PaginierungSchema.safeParse({ limit: "50" });
    if (r.success) expect(r.data.limit).toBe(50);
  });
});
