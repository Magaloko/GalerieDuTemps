// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSiteUrl, siteUrl, __resetSiteUrlCache } from "../site-url";

describe("site-url", () => {
  beforeEach(() => {
    __resetSiteUrlCache();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetSiteUrlCache();
  });

  it("nimmt NEXT_PUBLIC_SITE_URL als erste Priorität", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://galeriedutemps.kz");
    vi.stubEnv("NEXTAUTH_URL", "https://wrong.example.com");
    expect(getSiteUrl()).toBe("https://galeriedutemps.kz");
  });

  it("fällt auf NEXTAUTH_URL zurück wenn NEXT_PUBLIC_SITE_URL fehlt", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://auth.example.com");
    expect(getSiteUrl()).toBe("https://auth.example.com");
  });

  it("strippt trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com///");
    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("in dev: localhost-fallback wenn nichts gesetzt", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("in test: localhost-fallback wenn nichts gesetzt", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("KRITISCH: in production wirft Error wenn nichts gesetzt", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL.*NEXTAUTH_URL.*production/);
  });

  it("in production akzeptiert leeren NEXTAUTH_URL als nicht-gesetzt", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(() => getSiteUrl()).toThrow(/production/);
  });

  it("in production akzeptiert whitespace-only als nicht-gesetzt", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_URL", "   ");
    expect(() => getSiteUrl()).toThrow(/production/);
  });

  describe("siteUrl(path)", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://galeriedutemps.kz");
      __resetSiteUrlCache();
    });

    it("baut Pfad mit Slash zusammen", () => {
      expect(siteUrl("/katalog")).toBe("https://galeriedutemps.kz/katalog");
    });

    it("fügt fehlenden Slash hinzu", () => {
      expect(siteUrl("katalog")).toBe("https://galeriedutemps.kz/katalog");
    });

    it("leerer Pfad → nur Base-URL", () => {
      expect(siteUrl()).toBe("https://galeriedutemps.kz");
      expect(siteUrl("")).toBe("https://galeriedutemps.kz");
    });

    it("Query-Strings bleiben unangetastet", () => {
      expect(siteUrl("/api/x?a=1&b=2")).toBe("https://galeriedutemps.kz/api/x?a=1&b=2");
    });
  });

  it("Caching: zweiter Call liest nicht erneut env-vars", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://first.com");
    expect(getSiteUrl()).toBe("https://first.com");

    // Env-Variable ändern → Cache muss noch alten Wert zurückgeben (ohne reset)
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://second.com");
    expect(getSiteUrl()).toBe("https://first.com");

    __resetSiteUrlCache();
    expect(getSiteUrl()).toBe("https://second.com");
  });
});
