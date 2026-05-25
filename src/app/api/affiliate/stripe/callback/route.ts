import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";
import { getStripeConfig } from "@/lib/affiliate/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe OAuth-Callback nach erfolgreicher Verbindung.
 *
 * TODO: Echte Implementierung erfordert npm install stripe und Code-Tausch:
 *   const stripe = new Stripe(secretKey);
 *   const resp = await stripe.oauth.token({ grant_type: "authorization_code", code });
 *   stripe_account_id = resp.stripe_user_id;
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") {
    return NextResponse.redirect(new URL("/affiliate/anmelden", req.nextUrl));
  }

  const code  = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/affiliate/profil?stripe=error&msg=${encodeURIComponent(error)}`, req.nextUrl));
  }

  if (!code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/affiliate/profil?stripe=invalid", req.nextUrl));
  }

  const cfg = getStripeConfig();
  if (!cfg.ready) {
    return NextResponse.redirect(new URL("/affiliate/profil?stripe=not_configured", req.nextUrl));
  }

  // ─── TODO: Echte Stripe-SDK-Integration ─────────────────────────────────
  // try {
  //   const Stripe = (await import("stripe")).default;
  //   const stripe = new Stripe(cfg.secretKey!, { apiVersion: "2024-12-18.acacia" });
  //   const tokenResp = await stripe.oauth.token({
  //     grant_type: "authorization_code",
  //     code,
  //   });
  //   const accountId = tokenResp.stripe_user_id!;
  //   const account = await stripe.accounts.retrieve(accountId);
  //
  //   await query(
  //     `UPDATE sebo.affiliates
  //      SET stripe_account_id = $1,
  //          stripe_payouts_enabled = $2,
  //          stripe_charges_enabled = $3,
  //          stripe_connected_am = now()
  //      WHERE id = $4`,
  //     [accountId, account.payouts_enabled, account.charges_enabled, session.user.id]
  //   );
  //
  //   return NextResponse.redirect(new URL("/affiliate/profil?stripe=connected", req.nextUrl));
  // } catch (err) {
  //   console.error("[Stripe Callback]", err);
  //   return NextResponse.redirect(new URL("/affiliate/profil?stripe=error", req.nextUrl));
  // }
  // ─────────────────────────────────────────────────────────────────────────

  // STUB: Markiere "wäre verbunden" (für Demo-Zwecke ohne installiertes SDK)
  console.log("[Stripe Callback STUB] code:", code.slice(0, 20), "state:", state);

  return NextResponse.redirect(new URL("/affiliate/profil?stripe=stub_not_implemented", req.nextUrl));
}
