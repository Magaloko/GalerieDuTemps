import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("[Stripe] STRIPE_SECRET_KEY nicht gesetzt. Bitte .env.local prüfen.");
  }

  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    timeout:    30_000,
  });

  return _stripe;
}

export function stripeKonfiguriert(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("[Stripe] STRIPE_WEBHOOK_SECRET nicht gesetzt");
  }
  return secret;
}
