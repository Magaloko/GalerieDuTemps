/**
 * Kaspi.kz Pay Integration
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
 *   4. ENV setzen (in Coolify):
 *        KASPI_MERCHANT_ID=...
 *        KASPI_TERMINAL_ID=...
 *        KASPI_API_KEY=...
 *        KASPI_API_BASE=https://kaspi.kz/api/v2     (test: https://test.kaspi.kz/api/v2)
 *        KASPI_WEBHOOK_SECRET=...
 *   5. Webhook-URL im Kaspi-Kabinett registrieren:
 *        https://deine-domain.kz/api/kaspi/webhook
 *   6. Deploy → Kaspi ist automatisch aktiv (Kill-Switch: System-Einstellung
 *      `kaspi_enabled=false` deaktiviert es ohne ENV-Entfernung).
 *
 * HINWEIS zum API-Vertrag: Kaspi dokumentiert Endpoints/Feldnamen je nach
 * Merchant-Tarif leicht unterschiedlich. Die Request/Response-Mappings unten
 * sind defensiv (mehrere mögliche Feldnamen) — bei Abweichungen genügt eine
 * kleine Anpassung an EINER Stelle (siehe `pick()`-Aufrufe).
 *
 * Spec: https://guide.kaspi.kz/partner/ru/business/payments/api
 */

import crypto from "crypto";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";

const KASPI_TIMEOUT_MS = 10_000;

export interface KaspiConfig {
  enabled:      boolean;
  merchant_id:  string | null;
  terminal_id:  string | null;
  api_key:      string | null;
  api_base:     string;
  mode:         "test" | "live";
}

export async function getKaspiConfig(): Promise<KaspiConfig> {
  // System-Einstellung dient nur als Kill-Switch. Default = aktiv, sobald
  // Credentials vorhanden sind → „nur ENV setzen" reicht zum Aktivieren.
  let flagRaw: unknown = undefined;
  try {
    const sys = await systemEinstellungenLaden();
    flagRaw = (sys as unknown as Record<string, unknown>)["kaspi_enabled"];
  } catch {
    /* DB-Fehler → Kill-Switch ignorieren, allein Credentials entscheiden */
  }
  const explicitlyDisabled = flagRaw === false || flagRaw === "false" || flagRaw === 0 || flagRaw === "0";

  const merchant_id = process.env.KASPI_MERCHANT_ID ?? null;
  const terminal_id = process.env.KASPI_TERMINAL_ID ?? null;
  const api_key     = process.env.KASPI_API_KEY     ?? null;
  const hasCreds    = !!(merchant_id && terminal_id && api_key);

  return {
    enabled:     hasCreds && !explicitlyDisabled,
    merchant_id,
    terminal_id,
    api_key,
    api_base:    (process.env.KASPI_API_BASE ?? "https://kaspi.kz/api/v2").replace(/\/+$/, ""),
    mode:        process.env.KASPI_API_BASE?.includes("test") ? "test" : "live",
  };
}

export function kaspiKonfiguriert(cfg: KaspiConfig): boolean {
  return cfg.enabled && !!cfg.merchant_id && !!cfg.terminal_id && !!cfg.api_key;
}

/** Liest das erste vorhandene Feld aus einem Objekt (defensiv ggü. Feldnamen). */
function pick<T = unknown>(obj: Record<string, unknown> | null | undefined, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

/** Authentifizierte Headers für alle Kaspi-Requests. */
function kaspiHeaders(cfg: KaspiConfig): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Accept":        "application/json",
    "Authorization": `Bearer ${cfg.api_key}`,
    "X-Merchant-Id": cfg.merchant_id!,
    "X-Terminal-Id": cfg.terminal_id!,
  };
}

/** fetch mit Timeout (AbortController), wirft bei Netzwerk-/Timeout-Fehler. */
async function kaspiFetch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), KASPI_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Payment-Link erstellen (Pay-by-Link / QR)
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

  try {
    const resp = await kaspiFetch(`${cfg.api_base}/payments/create`, {
      method:  "POST",
      headers: kaspiHeaders(cfg),
      body: JSON.stringify({
        amount:         opts.betrag_kzt,
        currency:       "KZT",
        order_id:       opts.order_id,
        description:    opts.beschreibung,
        return_url:     opts.return_url,
        callback_url:   opts.webhook_url,
        customer_phone: opts.customer_phone,
      }),
    });

    const text = await resp.text();
    let data: Record<string, unknown> = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* nicht-JSON */ }

    if (!resp.ok) {
      const msg = pick<string>(data, "message", "error", "errorMessage") ?? `Kaspi API ${resp.status}`;
      console.error("[Kaspi] create failed:", resp.status, msg);
      return { ok: false, fehler: `Kaspi: ${msg}` };
    }

    const payment_id = pick<string>(data, "payment_id", "paymentId", "id", "invoiceId");
    const qr_url     = pick<string>(data, "qr_url", "qrUrl", "qrCodeUrl", "qr_image_url");
    const pay_url    = pick<string>(data, "pay_url", "payUrl", "paymentUrl", "redirectUrl", "url");

    if (!payment_id || (!qr_url && !pay_url)) {
      console.error("[Kaspi] create: unerwartete Antwort:", data);
      return { ok: false, fehler: "Kaspi: unerwartete API-Antwort (payment_id/url fehlen)." };
    }

    return { ok: true, payment_id, qr_url, pay_url };
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Kaspi-API Timeout"
      : err instanceof Error ? err.message : "API-Fehler";
    console.error("[Kaspi] create exception:", msg);
    return { ok: false, fehler: msg };
  }
}

// ---------------------------------------------------------------------------
// Payment-Status abfragen (Polling oder Webhook-Backup)
// ---------------------------------------------------------------------------
export interface KaspiPaymentStatus {
  status:  "pending" | "paid" | "failed" | "expired" | "cancelled";
  betrag?: number;
  bezahlt_am?: string;
}

/** Normalisiert Kaspi-Rohstatus → unser Enum. */
function normalisiereStatus(raw: unknown): KaspiPaymentStatus["status"] {
  const s = String(raw ?? "").toLowerCase();
  if (["paid", "completed", "success", "approved", "captured"].includes(s)) return "paid";
  if (["failed", "declined", "error", "rejected"].includes(s))             return "failed";
  if (["expired", "timeout"].includes(s))                                  return "expired";
  if (["cancelled", "canceled", "voided"].includes(s))                     return "cancelled";
  return "pending";
}

export async function getPaymentStatus(paymentId: string): Promise<KaspiPaymentStatus | null> {
  const cfg = await getKaspiConfig();
  if (!kaspiKonfiguriert(cfg)) return null;

  try {
    const resp = await kaspiFetch(`${cfg.api_base}/payments/${encodeURIComponent(paymentId)}/status`, {
      method:  "GET",
      headers: kaspiHeaders(cfg),
    });
    if (!resp.ok) {
      console.error("[Kaspi] status failed:", resp.status);
      return null;
    }
    const data = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      status:     normalisiereStatus(pick(data, "status", "state", "paymentStatus")),
      betrag:     pick<number>(data, "amount", "betrag"),
      bezahlt_am: pick<string>(data, "paid_at", "paidAt", "completed_at"),
    };
  } catch (err) {
    console.error("[Kaspi] status exception:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Webhook-Signaturprüfung (HMAC-SHA256, timing-safe)
// ---------------------------------------------------------------------------
export function verifyKaspiWebhook(payload: string, signature: string): boolean {
  const secret = process.env.KASPI_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest();
  // Eingehende Signatur kann hex ODER base64 sein → beide Varianten prüfen.
  const sig = signature.trim();
  for (const enc of ["hex", "base64"] as const) {
    try {
      const got = Buffer.from(sig, enc);
      if (got.length === expected.length && crypto.timingSafeEqual(got, expected)) {
        return true;
      }
    } catch {
      /* ungültiges Encoding → nächste Variante */
    }
  }
  return false;
}
