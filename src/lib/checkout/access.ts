import { timingSafeEqual } from "crypto";
import { auth } from "@/lib/auth/config";
import type { Order } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Checkout-Ownership-Prüfung gegen IDOR.
 *
 * Eine pending-Order darf nur weiterverarbeitet werden (Stripe-Session,
 * Bank-Referenz, Vor-Ort) wenn der Aufrufer entweder:
 *   a) das checkout_token kennt (wurde dem Besteller in der Redirect-URL
 *      nach Cart-Submit übergeben), ODER
 *   b) als eingeloggter Customer der Order-Eigentümer ist (customer_id).
 *
 * Token-Vergleich constant-time (timingSafeEqual) gegen Timing-Angriffe.
 * ────────────────────────────────────────────────────────────────────────── */

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** True wenn der Token zur Order passt. */
export function checkoutTokenGueltig(order: Order, token: string | null | undefined): boolean {
  if (!token || !order.checkout_token) return false;
  return safeEqual(order.checkout_token, token);
}

/**
 * Prüft Zugriff auf eine Order für Zahlungs-Operationen.
 * Returns true wenn Token passt ODER eingeloggter Customer = Eigentümer.
 */
export async function darfCheckoutBearbeiten(
  order: Order,
  token: string | null | undefined,
): Promise<boolean> {
  if (checkoutTokenGueltig(order, token)) return true;

  // Fallback: eingeloggter Customer der die Order besitzt
  if (order.customer_id) {
    const session = await auth().catch(() => null);
    if (session?.user?.role === "customer" && session.user.id === order.customer_id) {
      return true;
    }
  }
  return false;
}
