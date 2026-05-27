import { siteUrl } from "@/lib/site-url";

/**
 * Stripe-Connect Wrapper (Stub – Phase 9f Vorbereitung)
 *
 * Was hier vorbereitet ist:
 * - Konfiguration via ENV + System-Einstellungen
 * - Typsichere Interface-Stubs für später folgende Stripe-SDK-Calls
 * - OAuth-Connect-Flow gemäß Stripe-Connect (Express-Accounts empfohlen)
 *
 * Was du noch tun musst, um Stripe Connect live zu schalten:
 * 1. npm install stripe
 * 2. Stripe-Account anlegen, Connect aktivieren (Express oder Standard)
 * 3. Diese ENV-Vars setzen:
 *      STRIPE_SECRET_KEY=sk_live_... (oder sk_test_...)
 *      STRIPE_CONNECT_CLIENT_ID=ca_...
 *      STRIPE_WEBHOOK_SECRET=whsec_...
 *      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
 * 4. Webhook-URL bei Stripe registrieren: https://galeriedutemps.kz/api/webhooks/stripe
 * 5. In den TODO-Markierungen unten echte Stripe-SDK-Aufrufe ergänzen
 * 6. Im Admin: /admin/einstellungen → "Stripe-Connect aktivieren"
 */

import type { Affiliate } from "@/types/affiliate";

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
export interface StripeConfig {
  secretKey:        string | null;
  publishableKey:   string | null;
  connectClientId:  string | null;
  webhookSecret:    string | null;
  mode:             "test" | "live";
  ready:            boolean;       // Alle Pflicht-Vars gesetzt?
}

export function getStripeConfig(): StripeConfig {
  const secret  = process.env.STRIPE_SECRET_KEY            ?? null;
  const pub     = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
  const client  = process.env.STRIPE_CONNECT_CLIENT_ID     ?? null;
  const webhook = process.env.STRIPE_WEBHOOK_SECRET        ?? null;
  const mode    = secret?.startsWith("sk_live_") ? "live" : "test";

  return {
    secretKey:       secret,
    publishableKey:  pub,
    connectClientId: client,
    webhookSecret:   webhook,
    mode,
    ready:           !!(secret && client),
  };
}

// ---------------------------------------------------------------------------
// OAuth-URL für "Stripe-Konto verbinden" (Standard-Connect-Flow)
// ---------------------------------------------------------------------------
export function generateConnectUrl(affiliateId: string): string | null {
  const cfg = getStripeConfig();
  if (!cfg.ready) return null;

  const redirectUri = siteUrl("/api/affiliate/stripe/callback");
  const params = new URLSearchParams({
    response_type: "code",
    client_id:     cfg.connectClientId!,
    scope:         "read_write",
    state:         affiliateId,    // Wird im Callback zurückgegeben
    redirect_uri:  redirectUri,
  });

  return `https://connect.stripe.com/oauth/authorize?${params}`;
}

// ---------------------------------------------------------------------------
// Connected-Account einer Auszahlung gutschreiben (Transfer)
// TODO: Echte Stripe-SDK-Implementierung
// ---------------------------------------------------------------------------
export interface StripeTransferOptions {
  affiliate:    Affiliate;
  betragCent:   number;
  beschreibung: string;
  metadata?:    Record<string, string>;
}

export interface StripeTransferResult {
  ok:               boolean;
  transfer_id?:     string;
  fehler?:          string;
  betrag_cent?:     number;
}

export async function transferZuAffiliate(
  opts: StripeTransferOptions
): Promise<StripeTransferResult> {
  const cfg = getStripeConfig();
  if (!cfg.ready) {
    return { ok: false, fehler: "Stripe nicht konfiguriert (STRIPE_SECRET_KEY oder CLIENT_ID fehlt)" };
  }
  if (!opts.affiliate.stripe_account_id) {
    return { ok: false, fehler: "Affiliate hat kein verbundenes Stripe-Konto" };
  }
  if (!opts.affiliate.stripe_payouts_enabled) {
    return { ok: false, fehler: "Stripe-Konto noch nicht zur Auszahlung freigegeben" };
  }

  // ─── TODO: Echte Stripe-Implementierung ─────────────────────────────────
  // import Stripe from "stripe";
  // const stripe = new Stripe(cfg.secretKey!, { apiVersion: "2024-12-18.acacia" });
  //
  // try {
  //   const transfer = await stripe.transfers.create({
  //     amount:        opts.betragCent,
  //     currency:      "eur",
  //     destination:   opts.affiliate.stripe_account_id!,
  //     description:   opts.beschreibung,
  //     metadata:      opts.metadata,
  //   });
  //   return { ok: true, transfer_id: transfer.id, betrag_cent: opts.betragCent };
  // } catch (err: any) {
  //   return { ok: false, fehler: err.message };
  // }
  // ─────────────────────────────────────────────────────────────────────────

  console.log("[Stripe STUB] transferZuAffiliate – würde übertragen:", {
    affiliate: opts.affiliate.email,
    betrag_cent: opts.betragCent,
    stripe_account: opts.affiliate.stripe_account_id,
  });

  return {
    ok:           false,
    fehler:       "Stripe-SDK noch nicht installiert. Siehe src/lib/affiliate/stripe.ts für Setup.",
  };
}

// ---------------------------------------------------------------------------
// Connected-Account Status abrufen (für Profil-Anzeige)
// TODO: Echte Stripe-SDK-Implementierung
// ---------------------------------------------------------------------------
export interface StripeAccountStatus {
  account_id:        string;
  charges_enabled:   boolean;
  payouts_enabled:   boolean;
  details_submitted: boolean;
}

export async function getAccountStatus(_accountId: string): Promise<StripeAccountStatus | null> {
  const cfg = getStripeConfig();
  if (!cfg.ready) return null;

  // ─── TODO ───────────────────────────────────────────────────────────────
  // const stripe = new Stripe(cfg.secretKey!, { apiVersion: "2024-12-18.acacia" });
  // const account = await stripe.accounts.retrieve(accountId);
  // return {
  //   account_id:        account.id,
  //   charges_enabled:   account.charges_enabled,
  //   payouts_enabled:   account.payouts_enabled,
  //   details_submitted: account.details_submitted,
  // };
  // ─────────────────────────────────────────────────────────────────────────

  return null;
}
