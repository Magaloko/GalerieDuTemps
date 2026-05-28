// @vitest-environment node
import { describe, it, expect } from "vitest";
import { parsePreis, preisHatMarker } from "../telegram/caption-preis";

describe("parsePreis (Telegram-Caption Preis-Erkennung)", () => {
  it("liest reine Zahlen", () => {
    expect(parsePreis("45000")).toBe(45000);
    expect(parsePreis("  45000  ")).toBe(45000);
  });

  it("akzeptiert Tausender-Trenner (Leerzeichen / Punkt / Komma)", () => {
    expect(parsePreis("45 000")).toBe(45000);
    expect(parsePreis("45.000")).toBe(45000);
    expect(parsePreis("45,000")).toBe(45000);
    expect(parsePreis("1 250 000")).toBe(1250000);
  });

  it("akzeptiert Währungssuffixe", () => {
    expect(parsePreis("45000₸")).toBe(45000);
    expect(parsePreis("45 000 ₸")).toBe(45000);
    expect(parsePreis("45000 тг")).toBe(45000);
    expect(parsePreis("45000 тенге")).toBe(45000);
    expect(parsePreis("45000 KZT")).toBe(45000);
  });

  it("akzeptiert explizite Marker", () => {
    expect(parsePreis("Цена: 45000")).toBe(45000);
    expect(parsePreis("цена 45 000 ₸")).toBe(45000);
    expect(parsePreis("стоимость — 45000")).toBe(45000);
    expect(parsePreis("Price: 45000")).toBe(45000);
  });

  it("erkennt KEINE Epochen/Beschreibungen als Preis", () => {
    expect(parsePreis("1970-е")).toBeNull();
    expect(parsePreis("Шёлковое платье")).toBeNull();
    expect(parsePreis("Франция, 1950-е годы")).toBeNull();
    expect(parsePreis("")).toBeNull();
  });

  it("lehnt unplausible Werte ab (<= 1)", () => {
    expect(parsePreis("0")).toBeNull();
    expect(parsePreis("1")).toBeNull();
  });
});

describe("preisHatMarker (Auto-Live nur mit markiertem Preis)", () => {
  it("erkennt Währungs-Marker", () => {
    expect(preisHatMarker("45000₸")).toBe(true);
    expect(preisHatMarker("45 000 ₸")).toBe(true);
    expect(preisHatMarker("45000 тг")).toBe(true);
    expect(preisHatMarker("45000 тенге")).toBe(true);
    expect(preisHatMarker("45000 KZT")).toBe(true);
  });

  it("erkennt Schlüsselwort-Marker", () => {
    expect(preisHatMarker("Цена: 45000")).toBe(true);
    expect(preisHatMarker("стоимость 45000")).toBe(true);
    expect(preisHatMarker("Price 45000")).toBe(true);
  });

  it("nackte Zahl / Jahr ist NICHT markiert (bleibt Entwurf)", () => {
    expect(preisHatMarker("45000")).toBe(false);
    expect(preisHatMarker("1950")).toBe(false);
    expect(preisHatMarker("2010 год")).toBe(false);
    expect(preisHatMarker("45 000")).toBe(false);
  });
});
