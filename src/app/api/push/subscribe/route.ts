import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";

/* ──────────────────────────────────────────────────────────────────────────
 * /api/push/subscribe — Web-Push-Subscription für Admins
 *
 * POST   { endpoint, keys: { p256dh, auth } }  → Upsert (an Session-Admin gebunden)
 * DELETE { endpoint }                          → Abmelden (Subscription löschen)
 *
 * Nur admin/superadmin (sonst 401). benutzer_id = Session-User. user_agent
 * aus Header für spätere Geräte-Unterscheidung im Admin.
 * ────────────────────────────────────────────────────────────────────────── */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLLEN = ["admin", "superadmin"];

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !ADMIN_ROLLEN.includes(role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

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

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    await query(
      `INSERT INTO sebo.push_subscriptions (benutzer_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         benutzer_id = $1,
         p256dh      = $3,
         auth        = $4,
         user_agent  = $5`,
      [session.user.id, endpoint, p256dh, authKey, userAgent],
    );
  } catch (err) {
    console.error("[push/subscribe] DB-Fehler:", err);
    return NextResponse.json({ error: "db error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !ADMIN_ROLLEN.includes(role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

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
    await query(`DELETE FROM sebo.push_subscriptions WHERE endpoint = $1`, [endpoint]);
  } catch (err) {
    console.error("[push/subscribe] DELETE-Fehler:", err);
    return NextResponse.json({ error: "db error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
