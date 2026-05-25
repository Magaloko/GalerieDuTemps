/**
 * Kaspi.kz Pay Integration (Stub mit klarer Setup-Anleitung)
 *
 * Kaspi.kz ist DAS dominante Zahlungssystem in Kasachstan (~70% Marktanteil).
 * Drei Integrations-Wege:
 *
 *   1. **Kaspi QR** — Kunde scannt QR-Code mit Kaspi-App → bezahlt direkt aus Banking
 *   2. **Kaspi Pay** — Online-Checkout-Redirect (wie Stripe Checkout)
 *   3. **Pay-by-Link** — Link generieren, per SMS/WhatsApp/E-Mail an Kunde senden
 *
 * Was du brauchst um Live zu schalten:
 *   1. Kaspi-Business-Account auf https://kaspi.kz/merchant
 *   2. Merchant-ID + Terminal-ID aus dem Kaspi-Kabinett
 *   3. API-Key generieren (im Tab "API-Интеграция")
 *   4. ENV setzen:
 *        KASPI_MERCHANT_ID=...
 *        KASPI_TERMINAL_ID=...
 *        KASPI_API_KEY=...
 *        KASPI_API_BASE=https://kaspi.kz/api/v2     (test: https://test.kaspi.kz/api/v2)
 *        KASPI_WEBHOOK_SECRET=...
 *   5. Webhook-URL registrieren: https://deine-domain.kz/api/kaspi/webhook
 *   6. TODOs hier unten entkommentieren
 *
 * Spec: https://guide.kaspi.kz/partner/ru/business/payments/api
 */

import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";

export interface KaspiConfig {
  enabled:      boolean;
  merchant_id:  string | null;
  terminal_id:  string | null;
  api_key:      string | null;
  api_base:     string;
  mode:         "test" | "live";
}

export async function getKaspiConfig(): Promise<KaspiConfig> {
  const sys = await systemEinstellungenLaden();
  return {
    enabled:     sys["kaspi_enabled" as keyof typeof sys] as unknown as boolean ?? false,
    merchant_id: process.env.KASPI_MERCHANT_ID ?? null,
    terminal_id: process.env.KASPI_TERMINAL_ID ?? null,
    api_key:     process.env.KASPI_API_KEY     ?? null,
    api_base:    process.env.KASPI_API_BASE    ?? "https://kaspi.kz/api/v2",
    mode:        (process.env.KASPI_API_BASE?.includes("test") ? "test" : "live"),
  };
}

export function kaspiKonfiguriert(cfg: KaspiConfig): boolean {
  return cfg.enabled && !!cfg.merchant_id && !!cfg.terminal_id && !!cfg.api_key;
}

// ---------------------------------------------------------------------------
// Payment-Link erstellen (Pay-by-Link)
// ---------------------------------------------------------------------------
export interface KaspiPaymentLinkOptions {
  order_id:        string;
  betrag_kzt:      number;          // ganze Tenge
  beschreibung:    string;
  return_url:      string;          // erfolgs-URL
  webhook_url?:    string;
  customer_phone?: string;          // +7 7XX XXX XX XX
}

export interface KaspiPaymentLinkResult {
  ok:           boolean;
  payment_id?:  string;
  qr_url?:      string;             // URL des QR-Codes
  pay_url?:     string;             // Direktlink für Browser/Kaspi-App
  fehler?:      string;
}

export async function erstellePaymentLink(opts: KaspiPaymentLinkOptions): Promise<KaspiPaymentLinkResult> {
  const cfg = await getKaspiConfig();
  if (!kaspiKonfiguriert(cfg)) {
    return { ok: false, fehler: "Kaspi nicht konfiguriert. Setup: siehe src/lib/payment/kaspi.ts" };
  }

  // ─── TODO: Echte Kaspi-API-Aufruf ──────────────────────────────────────
  // try {
  //   const resp = await fetch(`${cfg.api_base}/payments/create`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${cfg.api_key}`,
  //       "X-Merchant-Id": cfg.merchant_id!,
  //       "X-Terminal-Id": cfg.terminal_id!,
  //     },
  //     body: JSON.stringify({
  //       amount:        opts.betrag_kzt,
  //       currency:      "KZT",
  //       order_id:      opts.order_id,
  //       description:   opts.beschreibung,
  //       return_url:    opts.return_url,
  //       callback_url:  opts.webhook_url,
  //       customer_phone: opts.customer_phone,
  //     }),
  //   });
  //   if (!resp.ok) throw new Error(`Kaspi API ${resp.status}`);
  //   const data = await resp.json();
  //   return {
  //     ok:         true,
  //     payment_id: data.payment_id,
  //     qr_url:     data.qr_url,
  //     pay_url:    data.pay_url,
  //   };
  // } catch (err) {
  //   return { ok: false, fehler: err instanceof Error ? err.message : "API-Fehler" };
  // }
  // ─────────────────────────────────────────────────────────────────────────

  console.log("[Kaspi STUB] erstellePaymentLink:", {
    order_id:   opts.order_id,
    betrag_kzt: opts.betrag_kzt,
    mode:       cfg.mode,
  });

  return {
    ok:    false,
    fehler: "Kaspi-API-Aufruf noch nicht implementiert. TODOs in src/lib/payment/kaspi.ts entkommentieren.",
  };
}

// ---------------------------------------------------------------------------
// Payment-Status abfragen (Polling oder Webhook-Backup)
// ---------------------------------------------------------------------------
export interface KaspiPaymentStatus {
  status:  "pending" | "paid" | "failed" | "expired" | "cancelled";
  betrag?: number;
  bezahlt_am?: string;
}

export async function getPaymentStatus(_paymentId: string): Promise<KaspiPaymentStatus | null> {
  const cfg = await getKaspiConfig();
  if (!kaspiKonfiguriert(cfg)) return null;

  // ─── TODO: Echte Kaspi-API-Aufruf ──────────────────────────────────────
  // const resp = await fetch(`${cfg.api_base}/payments/${paymentId}/status`, {
  //   headers: { "Authorization": `Bearer ${cfg.api_key}` },
  // });
  // if (!resp.ok) return null;
  // const data = await resp.json();
  // return { status: data.status, betrag: data.amount, bezahlt_am: data.paid_at };
  // ─────────────────────────────────────────────────────────────────────────

  return null;
}

// ---------------------------------------------------------------------------
// Webhook-Signaturprüfung (Stub)
// ---------------------------------------------------------------------------
export function verifyKaspiWebhook(_payload: string, _signature: string): boolean {
  const secret = process.env.KASPI_WEBHOOK_SECRET;
  if (!secret) return false;

  // ─── TODO: HMAC-SHA256-Prüfung gemäß Kaspi-Doku ────────────────────────
  // import crypto from "crypto";
  // const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  // ─────────────────────────────────────────────────────────────────────────

  return false;
}
