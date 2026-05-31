import { describe, it, expect } from "vitest";
import { berechneCart } from "../cart-berechnung";
import type { CartItem } from "@/types/commerce";

/**
 * Tests für die pure-function berechneCart.
 *
 * Diese Funktion ist Revenue-kritisch — ein Bug hier verfälscht alle Order-
 * Totals + Steuer-Beträge. Außerdem hatte sie historisch das "use client"-
 * Bug-Problem (Server-Import scheiterte), daher liegt sie jetzt in
 * /lib/cart-berechnung.ts ohne Directive.
 *
 * Test-Annahmen:
 *  - einzelpreis_cents ist BRUTTO (inkl. tax_rate)
 *  - tax_rate ist Prozentsatz (z.B. 12 für KZT, 19 für DE)
 *  - rabatt_cents wird vom subtotal abgezogen, proportional über Items verteilt
 *  - versand_cents addiert sich on top, mit eigenem versand_rate
 */

type TestItem = Pick<CartItem, "einzelpreis_cents" | "menge" | "tax_rate" | "tax_exempt">;

const item = (
  einzelpreis_cents: number,
  menge: number,
  tax_rate: number,
  tax_exempt = false,
): TestItem => ({ einzelpreis_cents, menge, tax_rate, tax_exempt });

describe("berechneCart", () => {
  // ── Boundary-Cases ──────────────────────────────────────────────────────
  it("leerer Cart liefert alle Werte = 0", () => {
    const r = berechneCart({ items: [] });
    expect(r.subtotal_cents).toBe(0);
    expect(r.rabatt_cents).toBe(0);
    expect(r.versand_cents).toBe(0);
    expect(r.tax_total_cents).toBe(0);
    expect(r.total_cents).toBe(0);
    expect(r.tax_breakdown).toEqual({});
    expect(r.item_details).toEqual([]);
  });

  it("einzelnes Item KZT (12% MwSt) — Tax-Anteil korrekt", () => {
    // 1.000.000 ¢ brutto bei 12% → netto ≈ 892.857, tax ≈ 107.143
    const r = berechneCart({ items: [item(1_000_000, 1, 12)] });
    expect(r.subtotal_cents).toBe(1_000_000);
    expect(r.total_cents).toBe(1_000_000);
    // tax = brutto * rate / (100+rate) = 1.000.000 * 12 / 112
    expect(r.tax_total_cents).toBe(Math.round(1_000_000 * 12 / 112));
    expect(r.tax_breakdown["12"]).toBeDefined();
    expect(r.tax_breakdown["12"].tax_cents).toBe(r.tax_total_cents);
    // item_details: ein Eintrag, tax_amount_cents === tax_total_cents (kein Rabatt)
    expect(r.item_details).toHaveLength(1);
    expect(r.item_details[0].tax_amount_cents).toBe(r.tax_total_cents);
    expect(r.item_details[0].brutto_nach_rabatt_cents).toBe(1_000_000);
  });

  it("multi-item mit gleichem Tax-Rate aggregiert in einem Breakdown-Eintrag", () => {
    const r = berechneCart({
      items: [
        item(50_000, 2, 12),  // 100.000 brutto
        item(30_000, 1, 12),  //  30.000 brutto
      ],
    });
    expect(r.subtotal_cents).toBe(130_000);
    expect(Object.keys(r.tax_breakdown)).toEqual(["12"]);
  });

  it("multi-item mit verschiedenen Tax-Rates splittet Breakdown", () => {
    const r = berechneCart({
      items: [
        item(100_000, 1, 12),   // KZT-Item
        item(100_000, 1, 19),   // DE-Item
        item(50_000,  1, 0),    // tax-exempt (z.B. Seminar)
      ],
    });
    expect(r.tax_breakdown["12"]).toBeDefined();
    expect(r.tax_breakdown["19"]).toBeDefined();
    expect(r.tax_breakdown["0"]).toBeDefined();
    expect(r.tax_breakdown["0"].tax_cents).toBe(0);
    expect(r.tax_breakdown["0"].netto_cents).toBe(50_000);
  });

  // ── Rabatt-Logik ────────────────────────────────────────────────────────
  it("Rabatt > Subtotal → nach_rabatt = 0 (kein negativer Total)", () => {
    const r = berechneCart({
      items:        [item(50_000, 1, 12)],
      rabatt_cents: 100_000,  // mehr als der Cart wert
    });
    expect(r.total_cents).toBe(0);
    expect(r.rabatt_cents).toBe(100_000);
    expect(r.subtotal_cents).toBe(50_000);
  });

  it("Rabatt wird proportional über Items verteilt", () => {
    const r = berechneCart({
      items: [
        item(100_000, 1, 12),  // 50% des Subtotals
        item(100_000, 1, 12),  // 50% des Subtotals
      ],
      rabatt_cents: 20_000,  // → 10.000 pro Item
    });
    // Beide Items kriegen 10.000 Rabatt → 90.000 brutto-nach-rabatt
    // Tax pro Item: 90.000 * 12/112 ≈ 9.643
    expect(r.tax_total_cents).toBeGreaterThan(0);
    expect(r.tax_total_cents).toBeLessThan(20_000);
    expect(r.total_cents).toBe(200_000 - 20_000);
    // item_details: zwei Einträge, Σ(tax_amount_cents) === tax_total_cents
    expect(r.item_details).toHaveLength(2);
    const sumItemTax = r.item_details.reduce((acc, d) => acc + d.tax_amount_cents, 0);
    expect(sumItemTax).toBe(r.tax_total_cents);
    // brutto_nach_rabatt pro Item = 90.000 (gleichmäßig verteilt)
    expect(r.item_details[0].brutto_nach_rabatt_cents).toBe(90_000);
    expect(r.item_details[1].brutto_nach_rabatt_cents).toBe(90_000);
  });

  // ── Versand-Logik ───────────────────────────────────────────────────────
  it("Versand-Kosten addieren sich on top mit eigenem Tax-Rate", () => {
    const r = berechneCart({
      items:         [item(100_000, 1, 12)],
      versand_cents: 5_000,
      versand_rate:  19,  // Versand mit DE-Rate auch bei KZT-Item
    });
    expect(r.subtotal_cents).toBe(100_000);
    expect(r.versand_cents).toBe(5_000);
    expect(r.total_cents).toBe(105_000);
    expect(r.tax_breakdown["12"]).toBeDefined();   // Item-Steuer
    expect(r.tax_breakdown["19"]).toBeDefined();   // Versand-Steuer
  });

  it("Versand-Default-Rate ist 19% wenn nicht angegeben", () => {
    const r = berechneCart({
      items:         [item(100_000, 1, 12)],
      versand_cents: 1_190,  // = 1.000 netto + 190 tax bei 19%
    });
    expect(r.tax_breakdown["19"]?.tax_cents).toBe(Math.round(1_190 * 19 / 119));
  });

  it("Versand 0 erzeugt keinen 19%-Breakdown-Eintrag (kein Phantom-Bucket)", () => {
    const r = berechneCart({
      items:         [item(100_000, 1, 12)],
      versand_cents: 0,
    });
    expect(r.tax_breakdown["19"]).toBeUndefined();
  });

  // ── Edge: tax_exempt ────────────────────────────────────────────────────
  it("tax_exempt mit tax_rate=0 → kein Tax", () => {
    const r = berechneCart({ items: [item(50_000, 1, 0, true)] });
    expect(r.tax_total_cents).toBe(0);
    expect(r.tax_breakdown["0"].netto_cents).toBe(50_000);
  });

  // ── item_details Σ-Invariante ───────────────────────────────────────────
  it("Σ(item_details.tax_amount_cents) === tax_total_cents bei Coupon + Mix-Rates", () => {
    // Gemischte Steuersätze + Coupon — testet Bug #5 Fix
    const r = berechneCart({
      items: [
        item(200_000, 1, 12),   // KZT-Item
        item(100_000, 1, 0),    // steuerbefreit
      ],
      rabatt_cents: 30_000,
    });
    const sumItemTax = r.item_details.reduce((acc, d) => acc + d.tax_amount_cents, 0);
    // Versand ist 0 → Σ Positions-Steuer muss exakt tax_total_cents sein
    expect(sumItemTax).toBe(r.tax_total_cents);
    expect(r.item_details).toHaveLength(2);
    // tax_exempt Item → tax_amount_cents = 0
    expect(r.item_details[1].tax_amount_cents).toBe(0);
  });

  // ── Rounding-Stabilität ────────────────────────────────────────────────
  it("Rounding bleibt stabil: 3 Items à 33¢ rabattiert um 50¢", () => {
    const r = berechneCart({
      items: [
        item(33, 1, 12),
        item(33, 1, 12),
        item(33, 1, 12),
      ],
      rabatt_cents: 50,
    });
    expect(r.subtotal_cents).toBe(99);
    expect(r.total_cents).toBe(49);  // 99 - 50
    // Kein NaN, kein negativ, breakdown vorhanden
    expect(r.tax_total_cents).toBeGreaterThanOrEqual(0);
    expect(r.tax_total_cents).toBeLessThan(50);
  });

  it("Sehr großer Total (Multi-Million-KZT) ohne Overflow", () => {
    const r = berechneCart({
      items: [item(50_000_000, 10, 12)],  // 500.000.000 ¢ = 5 Mio EUR
    });
    expect(r.subtotal_cents).toBe(500_000_000);
    expect(r.total_cents).toBe(500_000_000);
    expect(Number.isFinite(r.tax_total_cents)).toBe(true);
  });

  // ── Subtotal=0 Edge (alle Items menge=0) ────────────────────────────────
  it("Alle Items mit menge=0 → subtotal=0, kein DivisionByZero", () => {
    const r = berechneCart({
      items:        [item(100, 0, 12)],
      rabatt_cents: 10,  // Rabatt-Verteilung würde durch subtotal=0 durch 0 teilen
    });
    expect(r.subtotal_cents).toBe(0);
    // total kann negativ werden? Nein: Math.max(0, 0 - 10) = 0
    expect(r.total_cents).toBe(0);
    // Tax-Loop läuft trotzdem, aber item_anteil = 0 → kein NaN
    expect(Number.isFinite(r.tax_total_cents)).toBe(true);
  });
});
