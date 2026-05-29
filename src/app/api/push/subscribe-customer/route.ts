import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/push/subscribe-customer — Web-Push-Subscription für SHOP-BESUCHER
 *
 * POST   { endpoint, keys: { p256dh, auth } }  → Upsert (audience='customer')
 * DELETE { endpoint }                          → Abmelden (Subscription löschen)
 *
 * KEIN Admin-Gate: jeder Besucher darf „Neuheiten/Rabatte" abonnieren.
 *  - Eingeloggter Kunde (session.user.role === 'customer') → customer_id gesetzt.
 *  - Anonymer Gast → customer_id = NULL.
 * In jedem Fall: audience='customer', benutzer_id=NULL (das ist NICHT der
 * Operator-Pfad — der bleibt über /api/push/subscribe unberührt).
 * ────────────────────────────────────────────────────────────────────────── */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers: NO_STORE });
  }

  const b = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof b.endpoint === "string" ? b.endpoint : null;
  const p256dh   = typeof b.keys?.p256dh === "string" ? b.keys.p256dh : null;
  const authKey  = typeof b.keys?.auth === "string" ? b.keys.auth : null;

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "missing fields" }, { status: 400, headers: NO_STORE });
  }

  // Eingeloggter Kunde → an customer_id binden, sonst anonymer Gast (NULL).
  const session = await auth();
  const customerId =
    session?.user?.role === "customer" && session.user.id ? session.user.id : null;

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    await query(
      `INSERT INTO sebo.push_subscriptions
         (benutzer_id, customer_id, audience, endpoint, p256dh, auth, user_agent)
       VALUES (NULL, $1, 'customer', $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh      = $3,
         auth        = $4,
         customer_id = $1,
         audience    = 'customer',
         benutzer_id = NULL,
         user_agent  = $5`,
      [customerId, endpoint, p256dh, authKey, userAgent],
    );
  } catch (err) {
    console.error("[push/subscribe-customer] DB-Fehler:", err);
    return NextResponse.json({ error: "db error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers: NO_STORE });
  }

  const endpoint = typeof (body as { endpoint?: unknown }).endpoint === "string"
    ? (body as { endpoint: string }).endpoint
    : null;
  if (!endpoint) {
    return NextResponse.json({ error: "missing endpoint" }, { status: 400, headers: NO_STORE });
  }

  try {
    await query(
      `DELETE FROM sebo.push_subscriptions WHERE endpoint = $1 AND audience = 'customer'`,
      [endpoint],
    );
  } catch (err) {
    console.error("[push/subscribe-customer] DELETE-Fehler:", err);
    return NextResponse.json({ error: "db error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
