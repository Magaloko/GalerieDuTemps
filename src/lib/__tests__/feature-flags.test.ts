import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests für die Feature-Flag-Sicherheitslogik rund um den Schaufenster-Modus:
 *  - kaufenGesperrt() ist FAIL-CLOSED (DB-Fehler ⇒ Kauf gesperrt).
 *  - Notfall-Kill-Switch EMERGENCY_SHOP_DISABLE erzwingt Schaufenster.
 *  - isFeatureEnabled liefert den DB-Wert (fail-open für Anzeige).
 *
 * Die DB-Schicht (./index → query) wird gemockt; keine echte DB nötig.
 */

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
}));

const queryMock = vi.fn();
vi.mock("../db/index", () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

import {
  isFeatureEnabled,
  kaufenGesperrt,
  __clearFeatureFlagsCache,
} from "../db/feature-flags";

/** Hilfsfunktion: DB-Antwort für die feature_flags-Tabelle bauen. */
function flagRows(kaufenAktiv: boolean | undefined) {
  const rows: { schluessel: string; aktiviert: boolean }[] = [];
  if (kaufenAktiv !== undefined) {
    rows.push({ schluessel: "kaufen_aktiv", aktiviert: kaufenAktiv });
  }
  return { rows };
}

beforeEach(() => {
  queryMock.mockReset();
  __clearFeatureFlagsCache();
  delete process.env.EMERGENCY_SHOP_DISABLE;
});

describe("kaufenGesperrt (fail-closed)", () => {
  it("Shop aktiv (Row=true) ⇒ NICHT gesperrt", async () => {
    queryMock.mockResolvedValue(flagRows(true));
    expect(await kaufenGesperrt()).toBe(false);
  });

  it("Schaufenster (Row=false) ⇒ gesperrt", async () => {
    queryMock.mockResolvedValue(flagRows(false));
    expect(await kaufenGesperrt()).toBe(true);
  });

  it("Row fehlt (Code-Default true) ⇒ NICHT gesperrt", async () => {
    queryMock.mockResolvedValue(flagRows(undefined));
    expect(await kaufenGesperrt()).toBe(false);
  });

  it("DB-Fehler ⇒ gesperrt (fail-closed)", async () => {
    queryMock.mockRejectedValue(new Error("db down"));
    expect(await kaufenGesperrt()).toBe(true);
  });
});

describe("Notfall-Kill-Switch EMERGENCY_SHOP_DISABLE", () => {
  it("erzwingt Sperre trotz Row=true", async () => {
    process.env.EMERGENCY_SHOP_DISABLE = "true";
    queryMock.mockResolvedValue(flagRows(true));
    expect(await kaufenGesperrt()).toBe(true);
  });

  it("kippt auch die Anzeige: isFeatureEnabled('kaufen_aktiv') = false", async () => {
    process.env.EMERGENCY_SHOP_DISABLE = "true";
    queryMock.mockResolvedValue(flagRows(true));
    expect(await isFeatureEnabled("kaufen_aktiv")).toBe(false);
  });

  it("ohne ENV: normaler Zustand bleibt", async () => {
    queryMock.mockResolvedValue(flagRows(true));
    expect(await isFeatureEnabled("kaufen_aktiv")).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  it("liefert DB-Wert true", async () => {
    queryMock.mockResolvedValue(flagRows(true));
    expect(await isFeatureEnabled("kaufen_aktiv")).toBe(true);
  });

  it("liefert DB-Wert false", async () => {
    queryMock.mockResolvedValue(flagRows(false));
    expect(await isFeatureEnabled("kaufen_aktiv")).toBe(false);
  });
});
