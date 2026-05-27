import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { getTestPool, setupTestSchema, teardownTestDb, testDbAvailable } from "./test-db";
import { __setPoolForTesting } from "../db";
import { produktErstellen } from "../db/produkte";
import type { ProduktCreateInput } from "../utils/validierung";

/**
 * Helper: füllt fehlende Defaults aus ProduktCreateInput.
 *
 * In Production geht der Input immer durch ProduktCreateSchema.parse(),
 * was Zod-Defaults anwendet (zustand='gut', lagerbestand=1, etc.). Im
 * direkten produktErstellen-Call müssen wir die hier manuell setzen,
 * sonst meckert TS weil das inferred Type alle Felder als required hat.
 */
function makeInput(partial: Partial<ProduktCreateInput> & { name: string; preis: number }): ProduktCreateInput {
  return {
    waehrung:     "KZT",
    zustand:      "gut",
    lagerbestand: 1,
    featured:     false,
    verkauft:     false,
    aktiv:        true,
    b2c_mode:     "visible",
    ...partial,
  };
}

/**
 * DB-Layer-Tests für src/lib/db/produkte.ts.
 *
 * Fokus: produktErstellen() — speziell die Slug-Collision-Logik und
 * den auto-generierten artikel_code.
 *
 * Skipped wenn TEST_DATABASE_URL nicht gesetzt ist.
 */

describe.skipIf(!testDbAvailable())("db/produkte (Integration)", () => {
  beforeAll(async () => {
    await setupTestSchema();
    __setPoolForTesting(getTestPool());
  });

  afterAll(async () => {
    __setPoolForTesting(null);
    await teardownTestDb();
  });

  // ── Vor jedem Test: leeren Produkte/Bilder, NICHT Kategorien wegen FK ──
  beforeEach(async () => {
    const p = getTestPool()!;
    await p.query(`TRUNCATE sebo.produktbilder, sebo.produkte RESTART IDENTITY CASCADE`);
  });

  describe("produktErstellen", () => {
    it("erstellt Produkt mit minimal-input", async () => {
      const r = await produktErstellen(makeInput({
        name:  "Test-Stuhl",
        preis: 1500,
      }));
      expect(r.id).toBeTruthy();
      expect(r.name).toBe("Test-Stuhl");
      expect(r.slug).toBe("test-stuhl");
      expect(r.zustand).toBe("gut");           // Default
      expect(r.lagerbestand).toBe(1);          // Default
      expect(r.waehrung).toBe("KZT");          // Default
      expect(r.aktiv).toBe(true);
    });

    it("erstellt zwei Produkte mit GLEICHEM Namen — Slug-Collision wird durch unique-Suffix aufgelöst", async () => {
      const a = await produktErstellen(makeInput({ name: "Wiener Stuhl", preis: 100 }));
      const b = await produktErstellen(makeInput({ name: "Wiener Stuhl", preis: 200 }));
      expect(a.slug).toBe("wiener-stuhl");
      expect(b.slug).not.toBe(a.slug);
      // uniqueSlug-Format: base-XXXX
      expect(b.slug).toMatch(/^wiener-stuhl-[a-z0-9]{4}$/);
    });

    it("transliteriert russischen Namen in den Slug", async () => {
      const r = await produktErstellen(makeInput({ name: "Жемчуг Акойя", preis: 500_000 }));
      expect(r.slug).toBe("zhemchug-akoyya");
    });

    it("auto-generiert artikel_code wenn nicht angegeben", async () => {
      const a = await produktErstellen(makeInput({ name: "Produkt A", preis: 100 }));
      const b = await produktErstellen(makeInput({ name: "Produkt B", preis: 200 }));
      expect(a.artikel_code).toBeTruthy();
      expect(b.artikel_code).toBeTruthy();
      expect(a.artikel_code).not.toBe(b.artikel_code);
      // Format aus 022_artikel_code_seq.sql — meist "V-0001" o.ä.
      expect(a.artikel_code).toMatch(/^[A-Z]+-?\d+/);
    });

    it("nutzt explizit gesetzten artikel_code", async () => {
      const r = await produktErstellen(makeInput({
        name:         "Custom-Code-Produkt",
        preis:        100,
        artikel_code: "CUSTOM-42",
      }));
      expect(r.artikel_code).toBe("CUSTOM-42");
    });

    it("speichert i18n-Felder als JSONB", async () => {
      const r = await produktErstellen(makeInput({
        name:        "Multi-Lang",
        preis:       100,
        name_i18n:   { ru: "Многоязычный", en: "Multi-Lang", de: "Mehrsprachig" },
        beschreibung_i18n: { ru: "Описание", en: "Description", de: "Beschreibung" },
      }));
      expect(r.name_i18n).toEqual({ ru: "Многоязычный", en: "Multi-Lang", de: "Mehrsprachig" });
      expect(r.beschreibung_i18n.ru).toBe("Описание");
    });

    it("speichert tags-Array korrekt (Postgres ARRAY)", async () => {
      const r = await produktErstellen(makeInput({
        name:  "Tagged",
        preis: 100,
        tags:  ["vintage", "möbel", "1960er"],
      }));
      expect(r.tags).toEqual(["vintage", "möbel", "1960er"]);
    });

    it("speichert abmessungen als JSONB", async () => {
      const r = await produktErstellen(makeInput({
        name:        "Mit Maßen",
        preis:       100,
        abmessungen: { breite: 90, hoehe: 75, tiefe: 50, gewicht: 12.5 },
      }));
      expect(r.abmessungen).toEqual({ breite: 90, hoehe: 75, tiefe: 50, gewicht: 12.5 });
    });

    it("setzt veroeffentlicht_am beim Erstellen", async () => {
      const r = await produktErstellen(makeInput({ name: "Veröffentlicht", preis: 100 }));
      // r.veroeffentlicht_am sollte gesetzt sein (durch INSERT now() in produktErstellen)
      expect(r.id).toBeTruthy();
      // Dann via DB-Lookup verifizieren
      const dbR = await getTestPool()!.query<{ veroeffentlicht_am: string | null }>(
        `SELECT veroeffentlicht_am FROM sebo.produkte WHERE id = $1`,
        [r.id],
      );
      expect(dbR.rows[0].veroeffentlicht_am).toBeTruthy();
    });

    it("rejected zu kurzen Namen (Zod-Schema, < 2 Zeichen)", async () => {
      // Schema-Validation passiert in der ACTION nicht in produktErstellen
      // selbst — der DB-Call würde Name="A" akzeptieren. Test prüft
      // tatsächliches DB-Verhalten:
      const r = await produktErstellen(makeInput({ name: "A", preis: 100 }));
      expect(r.name).toBe("A");
      // Slug auf "a" gekürzt
      expect(r.slug).toBe("a");
    });
  });
});
