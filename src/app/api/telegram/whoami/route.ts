import { NextRequest, NextResponse } from "next/server";
import { getWebAppSession, clearWebAppSessionCookie } from "@/lib/telegram/webapp-session";
import { customerById } from "@/lib/db/customers";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/telegram/whoami
 *
 * Liest den Mini-App-Session-Cookie und gibt die Identity zurück. Anders
 * als /api/telegram/auth braucht das KEIN initData — nur das Cookie
 * (das vom letzten /auth-Call gesetzt wurde).
 *
 * Verwendet von Client-Komponenten die rollen-spezifisch rendern wollen
 * (z.B. TabBar — Admin sieht andere Tabs).
 *
 * Response:
 *   { role: "admin",    user: { id, name, email, rolle } }
 *   { role: "customer", user: { id, vorname, email } }
 *   { role: "guest" }
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const session = await getWebAppSession();
  if (!session) {
    return NextResponse.json({ role: "guest" });
  }

  // SICHERHEIT: Wenn die Session an eine Telegram-User-ID gebunden ist (tgId)
  // UND der Client eine ANDERE aktuelle ID meldet (x-tg-id Header aus
  // window.Telegram), gehört das Cookie einem anderen Nutzer — auf einem Gerät
  // mit mehreren Telegram-Accounts (geteilter Cookie-Jar). Dann sofort Cookie
  // löschen + als Gast behandeln, NICHT die fremde (z.B. Admin-)Identität
  // ausliefern. Der x-tg-id ist clientseitig (nicht HMAC-verifiziert), aber für
  // diese Mismatch-Erkennung genügt das: ein anderer Nutzer meldet seine eigene
  // ID, die nicht zur gebundenen Cookie-ID passt → Downgrade.
  const clientTgIdRaw = req.headers.get("x-tg-id");
  const clientTgId    = clientTgIdRaw ? Number(clientTgIdRaw) : null;
  if (session.tgId != null && clientTgId != null && Number.isFinite(clientTgId) && clientTgId !== session.tgId) {
    await clearWebAppSessionCookie().catch(() => {});
    return NextResponse.json({ role: "guest", reason: "tg-id-mismatch" });
  }

  try {
    if (session.role === "admin") {
      const r = await query<{
        id: string; name: string | null; email: string; rolle: string;
      }>(
        `SELECT id, name, email, rolle FROM sebo.benutzer
         WHERE id = $1 AND aktiv = true LIMIT 1`,
        [session.subjectId],
      );
      const u = r.rows[0];
      if (!u) return NextResponse.json({ role: "guest" });
      return NextResponse.json({
        role: "admin",
        user: u,
      });
    }

    if (session.role === "customer") {
      const c = await customerById(session.subjectId);
      if (!c) return NextResponse.json({ role: "guest" });
      return NextResponse.json({
        role: "customer",
        user: {
          id:       c.id,
          vorname:  c.vorname,
          nachname: c.nachname,
          email:    c.email,
        },
      });
    }
  } catch (err) {
    console.warn("[whoami]", err);
  }

  return NextResponse.json({ role: "guest" });
}
