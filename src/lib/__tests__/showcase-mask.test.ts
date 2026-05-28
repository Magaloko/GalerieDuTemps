import { describe, it, expect } from "vitest";
import { maskBestand, maskBestandListe } from "../utils/showcase-mask";

/**
 * Tests für die Schaufenster-Bestand-Maskierung.
 *
 * Invariante: im Schaufenster-Modus (kaufenAktiv=false) darf der exakte
 * lagerbestand NIE an den Kunden gelangen — nur binär (0 weg / 1 vorhanden).
 * Im Shop-Modus (true) ist die Maskierung ein No-op (Identität).
 */

type P = { id: string; lagerbestand: number; name?: string };
const p = (id: string, lagerbestand: number): P => ({ id, lagerbestand, name: `n-${id}` });

describe("maskBestand", () => {
  it("Schaufenster: >1 wird zu 1", () => {
    expect(maskBestand(p("a", 7), false).lagerbestand).toBe(1);
  });

  it("Schaufenster: 1 bleibt 1", () => {
    expect(maskBestand(p("a", 1), false).lagerbestand).toBe(1);
  });

  it("Schaufenster: 0 bleibt 0 (ausverkauft erkennbar)", () => {
    expect(maskBestand(p("a", 0), false).lagerbestand).toBe(0);
  });

  it("Shop-Modus: unveränderter exakter Bestand", () => {
    expect(maskBestand(p("a", 7), true).lagerbestand).toBe(7);
  });

  it("erhält alle anderen Felder", () => {
    const out = maskBestand(p("a", 5), false);
    expect(out.id).toBe("a");
    expect(out.name).toBe("n-a");
  });

  it("mutiert das Original NICHT", () => {
    const orig = p("a", 9);
    maskBestand(orig, false);
    expect(orig.lagerbestand).toBe(9);
  });

  it("Shop-Modus gibt dieselbe Referenz zurück (no-op)", () => {
    const orig = p("a", 9);
    expect(maskBestand(orig, true)).toBe(orig);
  });
});

describe("maskBestandListe", () => {
  it("Schaufenster: maskiert jedes Element binär", () => {
    const out = maskBestandListe([p("a", 7), p("b", 0), p("c", 1)], false);
    expect(out.map(x => x.lagerbestand)).toEqual([1, 0, 1]);
  });

  it("Shop-Modus: Liste unverändert (no-op)", () => {
    const list = [p("a", 7), p("b", 3)];
    expect(maskBestandListe(list, true)).toBe(list);
  });

  it("leere Liste bleibt leer", () => {
    expect(maskBestandListe([], false)).toEqual([]);
  });
});
