import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  PAYMENT_METHODS,
  isMethodAvailable,
  providerEnvOk,
  generatePaymentReference,
  type PaymentMethodInfo,
} from "../payment/methods";

/**
 * Tests für Payment-Method-Registry + Filter-Logic.
 *
 * Wichtig: providerEnvOk liest process.env zur Laufzeit. Wir nutzen
 * vi.stubEnv()/vi.unstubAllEnvs() statt direkter Mutation, damit
 * Test-Isolation garantiert ist und parallele Tests sich nicht in die
 * Quere kommen.
 */

describe("PAYMENT_METHODS registry", () => {
  it("enthält alle 6 erwarteten Methoden", () => {
    const methods = PAYMENT_METHODS.map(m => m.method);
    expect(methods).toContain("stripe_card");
    expect(methods).toContain("paypal");
    expect(methods).toContain("crypto_nowpayments");
    expect(methods).toContain("bank_transfer");
    expect(methods).toContain("vor_ort_anzahlung");
    expect(methods).toContain("vor_ort");
  });

  it("jede Methode hat title/sub in RU/EN/DE", () => {
    for (const m of PAYMENT_METHODS) {
      expect(m.labels.title.ru).toBeTruthy();
      expect(m.labels.title.en).toBeTruthy();
      expect(m.labels.title.de).toBeTruthy();
      expect(m.labels.sub.ru).toBeTruthy();
    }
  });

  it("Vor-Ort-Methoden haben requiresShippingCountry=['KZ']", () => {
    const vorOrt = PAYMENT_METHODS.find(m => m.method === "vor_ort")!;
    const anzahlung = PAYMENT_METHODS.find(m => m.method === "vor_ort_anzahlung")!;
    expect(vorOrt.requiresShippingCountry).toEqual(["KZ"]);
    expect(anzahlung.requiresShippingCountry).toEqual(["KZ"]);
  });
});

describe("isMethodAvailable", () => {
  const stripeCard: PaymentMethodInfo = PAYMENT_METHODS.find(m => m.method === "stripe_card")!;
  const vorOrt: PaymentMethodInfo = PAYMENT_METHODS.find(m => m.method === "vor_ort")!;

  // ── Lieferland-Filter ──────────────────────────────────────────────────
  it("Vor-Ort + shippingCountry='KZ' → verfügbar", () => {
    expect(isMethodAvailable(vorOrt, { shippingCountry: "KZ", envCheck: true })).toBe(true);
  });

  it("Vor-Ort + shippingCountry='DE' → NICHT verfügbar (KZ-only)", () => {
    expect(isMethodAvailable(vorOrt, { shippingCountry: "DE", envCheck: true })).toBe(false);
  });

  it("Vor-Ort + shippingCountry='kz' (lower-case) → verfügbar (case-insensitive)", () => {
    expect(isMethodAvailable(vorOrt, { shippingCountry: "kz", envCheck: true })).toBe(true);
  });

  it("Vor-Ort + shippingCountry='Kz' (mixed-case) → verfügbar", () => {
    expect(isMethodAvailable(vorOrt, { shippingCountry: "Kz", envCheck: true })).toBe(true);
  });

  it("Stripe-Card OHNE shippingCountry-Filter → immer verfügbar wenn envCheck=true", () => {
    expect(isMethodAvailable(stripeCard, { shippingCountry: "DE", envCheck: true })).toBe(true);
    expect(isMethodAvailable(stripeCard, { shippingCountry: "KZ", envCheck: true })).toBe(true);
    expect(isMethodAvailable(stripeCard, { shippingCountry: "RU", envCheck: true })).toBe(true);
  });

  // ── ENV-Check ──────────────────────────────────────────────────────────
  it("envCheck=false → IMMER NICHT verfügbar", () => {
    expect(isMethodAvailable(stripeCard, { envCheck: false })).toBe(false);
    expect(isMethodAvailable(vorOrt, { envCheck: false, shippingCountry: "KZ" })).toBe(false);
  });

  it("envCheck undefined → wird als true behandelt (Default)", () => {
    expect(isMethodAvailable(stripeCard, {})).toBe(true);
  });
});

describe("providerEnvOk", () => {
  beforeEach(() => {
    // Reset alle relevanten ENVs vor jedem Test
    vi.stubEnv("STRIPE_SECRET_KEY",                "");
    vi.stubEnv("PAYPAL_CLIENT_ID",                 "");
    vi.stubEnv("PAYPAL_SECRET",                    "");
    vi.stubEnv("NOWPAYMENTS_API_KEY",              "");
    vi.stubEnv("TELEGRAM_PAYMENTS_PROVIDER_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stripe_card ohne STRIPE_SECRET_KEY → false", () => {
    expect(providerEnvOk("stripe_card")).toBe(false);
  });

  it("stripe_card mit STRIPE_SECRET_KEY → true", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xyz");
    expect(providerEnvOk("stripe_card")).toBe(true);
  });

  it("stripe_sepa nutzt selbes Stripe-Secret wie stripe_card", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_xyz");
    expect(providerEnvOk("stripe_sepa")).toBe(true);
    expect(providerEnvOk("vor_ort_anzahlung")).toBe(true);  // Anzahlung nutzt auch Stripe
  });

  it("paypal braucht BEIDE CLIENT_ID und SECRET", () => {
    vi.stubEnv("PAYPAL_CLIENT_ID", "client_xyz");
    expect(providerEnvOk("paypal")).toBe(false);  // SECRET fehlt noch

    vi.stubEnv("PAYPAL_SECRET", "secret_xyz");
    expect(providerEnvOk("paypal")).toBe(true);
  });

  it("paypal mit nur SECRET, ohne CLIENT_ID → false", () => {
    vi.stubEnv("PAYPAL_SECRET", "secret_xyz");
    expect(providerEnvOk("paypal")).toBe(false);
  });

  it("crypto_nowpayments braucht nur NOWPAYMENTS_API_KEY", () => {
    expect(providerEnvOk("crypto_nowpayments")).toBe(false);
    vi.stubEnv("NOWPAYMENTS_API_KEY", "key_xyz");
    expect(providerEnvOk("crypto_nowpayments")).toBe(true);
  });

  it("telegram_payments braucht TELEGRAM_PAYMENTS_PROVIDER_TOKEN", () => {
    expect(providerEnvOk("telegram_payments")).toBe(false);
    vi.stubEnv("TELEGRAM_PAYMENTS_PROVIDER_TOKEN", "tok_xyz");
    expect(providerEnvOk("telegram_payments")).toBe(true);
  });

  it("bank_transfer / vor_ort / kaspi sind IMMER true (kein Provider-Key nötig)", () => {
    expect(providerEnvOk("bank_transfer")).toBe(true);
    expect(providerEnvOk("vor_ort")).toBe(true);
    expect(providerEnvOk("kaspi")).toBe(true);
  });
});

describe("generatePaymentReference", () => {
  it("formatiert 1 als GDT-0001 (4-stellig padded)", () => {
    expect(generatePaymentReference(1)).toBe("GDT-0001");
  });

  it("formatiert 42 als GDT-0042", () => {
    expect(generatePaymentReference(42)).toBe("GDT-0042");
  });

  it("formatiert 9999 als GDT-9999 (genau 4-stellig)", () => {
    expect(generatePaymentReference(9999)).toBe("GDT-9999");
  });

  it("orderNumber > 9999 wird NICHT abgeschnitten — wächst auf 5 Stellen", () => {
    expect(generatePaymentReference(12345)).toBe("GDT-12345");
    expect(generatePaymentReference(1_000_000)).toBe("GDT-1000000");
  });

  it("orderNumber=0 → GDT-0000 (Edge, sollte nie passieren weil SERIAL ab 1)", () => {
    expect(generatePaymentReference(0)).toBe("GDT-0000");
  });
});
