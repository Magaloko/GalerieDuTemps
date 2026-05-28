import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth/config";
import type { Order } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Checkout-Ownership gegen IDOR — Cookie-basiert (statt URL-Token).
 *
 * Problem mit URL-Token (?t=): landet in Browser-History, Referer-Header,
 * Proxy-/Server-Logs. Lösung: HttpOnly-Cookie `__Secure-galerie-checkout`
 * = "<orderId>.<token>". Wird beim Order-Anlegen gesetzt, bei jeder Checkout-
 * Seite/Route serverseitig geprüft. Nicht aus JS lesbar, nicht in URLs.
 *
 * Zugriff erlaubt wenn:
 *   a) Cookie passt (orderId + checkout_token, constant-time), ODER
 *   b) eingeloggter Customer = Order-Eigentümer, ODER
 *   c) (nur Erfolg-Seite) Stripe-session_id stimmt mit order.stripe_session_id.
 * ────────────────────────────────────────────────────────────────────────── */

const COOKIE_NAME = "__Secure-galerie-checkout";
const TTL_SECONDS = 2 * 60 * 60;   // 2h — Checkout-Fenster

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Setzt das Checkout-Access-Cookie (beim Order-Anlegen, Picker-Modus). */
export async function setCheckoutAccessCookie(orderId: string, token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, `${orderId}.${token}`, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",   // lax: bleibt bei Stripe-Redirect zurück auf unsere Domain erhalten
    path:     "/",
    maxAge:   TTL_SECONDS,
  });
}

/** Cookie-Token gegen die Order prüfen (constant-time). */
async function cookieGueltig(order: Order): Promise<boolean> {
  if (!order.checkout_token) return false;
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const sep = raw.indexOf(".");
  if (sep < 0) return false;
  const cookieOrderId = raw.slice(0, sep);
  const cookieToken   = raw.slice(sep + 1);
  if (cookieOrderId !== order.id) return false;
  return safeEqual(order.checkout_token, cookieToken);
}

/**
 * Hauptprüfung für Checkout-Seiten + Zahlungs-Routen.
 * @param stripeSessionId  optional — nur Erfolg-Seite reicht ?session_id durch.
 */
export async function darfCheckoutBearbeiten(
  order: Order,
  opts?: { stripeSessionId?: string | null; legacyToken?: string | null },
): Promise<boolean> {
  // a) Cookie
  if (await cookieGueltig(order)) return true;

  // a2) Übergangs-Fallback: expliziter Token (z.B. alte Links mit ?t=)
  if (opts?.legacyToken && order.checkout_token && safeEqual(order.checkout_token, opts.legacyToken)) {
    return true;
  }

  // b) eingeloggter Customer = Eigentümer
  if (order.customer_id) {
    const session = await auth().catch(() => null);
    if (session?.user?.role === "customer" && session.user.id === order.customer_id) {
      return true;
    }
  }

  // c) Stripe-Erfolgs-Redirect: session_id beweist dass es der echte Käufer ist
  if (opts?.stripeSessionId && order.stripe_session_id && safeEqual(order.stripe_session_id, opts.stripeSessionId)) {
    return true;
  }

  return false;
}
