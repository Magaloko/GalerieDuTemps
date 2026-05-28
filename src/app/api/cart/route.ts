import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import {
  cartLaden, cartSpeichern, cartLeeren, mergeCart,
} from "@/lib/db/cart-server";
import type { CartItem } from "@/types/commerce";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/cart — Server-Cart für linked Customers.
 *
 * Resolved Customer-ID aus zwei möglichen Sessions:
 *   1. NextAuth Customer-Session (Web /kunde, /warenkorb)
 *   2. Telegram-WebApp Session-Cookie (Mini-App /tg/*)
 *
 * Wenn keine Session → 401 (Client bleibt auf localStorage).
 *
 * Endpoints:
 *   GET     → { items, coupon_code, aktualisiert_am } | null wenn leer
 *   PUT     → Cart ersetzen (Client-Source-of-Truth)
 *   POST    → Merge mit existing Server-Cart (für Login-Migration)
 *   DELETE  → Cart leeren (z.B. nach Checkout — falls Client das triggert)
 * ────────────────────────────────────────────────────────────────────────── */

async function resolveCustomerId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.role === "customer" && session.user.id) {
    return session.user.id;
  }
  const tgSession = await getWebAppSession();
  if (tgSession?.customerId) {
    return tgSession.customerId;
  }
  return null;
}

/** Schaufenster-Modus: kein Server-Cart-State. fail-open (Anzeige). */
async function schaufenster(): Promise<boolean> {
  const { isFeatureEnabled } = await import("@/lib/db/feature-flags");
  return !(await isFeatureEnabled("kaufen_aktiv").catch(() => true));
}

// Validation für CartItem im Body (matches types/commerce.ts CartItem)
const CartItemSchema = z.object({
  produkt_id:        z.string().uuid(),
  slug:              z.string(),
  name:              z.string(),
  bild_url:          z.string().nullable(),
  einzelpreis_cents: z.number().int().nonnegative(),
  menge:             z.number().int().positive().max(99),
  tax_rate:          z.number().nonnegative().default(0),
  tax_exempt:        z.boolean().default(false),
  ist_seminar:       z.boolean().default(false),
  max_menge:         z.number().int().positive().optional(),
});

const PutSchema = z.object({
  items:       z.array(CartItemSchema).max(50),
  coupon_code: z.string().nullable().optional(),
});

export async function GET() {
  const customerId = await resolveCustomerId();
  if (!customerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Schaufenster: nie Cart-Items ausliefern.
  if (await schaufenster()) {
    return NextResponse.json({ items: [], coupon_code: null, aktualisiert_am: null });
  }

  const cart = await cartLaden(customerId);
  return NextResponse.json(cart ?? { items: [], coupon_code: null, aktualisiert_am: null });
}

export async function PUT(req: NextRequest) {
  const customerId = await resolveCustomerId();
  if (!customerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Schaufenster: keine Cart-Mutation.
  if (await schaufenster()) {
    return NextResponse.json({ error: "Корзина недоступна" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  await cartSpeichern(
    customerId,
    parsed.data.items as CartItem[],
    parsed.data.coupon_code ?? null,
  );
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  // Merge — wird beim Login aufgerufen, wenn der Anonymous-Cart auf den
  // Server soll und potenziell vorhandene Server-Items dabei bleiben.
  const customerId = await resolveCustomerId();
  if (!customerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Schaufenster: kein Merge/keine Cart-Mutation.
  if (await schaufenster()) {
    return NextResponse.json({ error: "Корзина недоступна" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const existing = await cartLaden(customerId);
  const merged   = mergeCart(parsed.data.items as CartItem[], existing?.items ?? []);
  const coupon   = parsed.data.coupon_code ?? existing?.coupon_code ?? null;

  await cartSpeichern(customerId, merged, coupon);
  return NextResponse.json({ ok: true, items: merged, coupon_code: coupon });
}

export async function DELETE() {
  const customerId = await resolveCustomerId();
  if (!customerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await cartLeeren(customerId);
  return NextResponse.json({ ok: true });
}
