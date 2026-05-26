import { NextRequest, NextResponse } from "next/server";
import {
  verifyInitData,
  loadBotTokenForAuth,
  findOrCreateCustomerForTelegramUser,
} from "@/lib/telegram/webapp-auth";
import { setWebAppSessionCookie } from "@/lib/telegram/webapp-session";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/auth
 *
 * Body: { initData: string }   — der Wert aus window.Telegram.WebApp.initData
 *
 * Flow:
 *   1. Bot-Token aus DB laden (sebo.kanal_konten)
 *   2. initData via HMAC verifizieren (constant-time)
 *   3. Customer per Telegram-User-ID finden oder anlegen
 *   4. Session-Cookie setzen (eigenständig, nicht NextAuth)
 *
 * Response: { ok: true, customer: {id, vorname} } oder 401 mit Fehler.
 *
 * Sicherheit: niemand kann ohne gültigen Bot-Token einen Hash erzeugen.
 * Verfälschte initData → invalid hash → 401. Replay-Schutz via auth_date
 * (24h Toleranz, in verifyInitData).
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const initData = body.initData?.trim();
  if (!initData) {
    return NextResponse.json({ error: "initData fehlt" }, { status: 400 });
  }

  const botToken = await loadBotTokenForAuth();
  if (!botToken) {
    return NextResponse.json(
      { error: "Bot nicht konfiguriert — Admin: /admin/einstellungen/telegram" },
      { status: 503 },
    );
  }

  const valid = verifyInitData(initData, botToken);
  if (!valid) {
    return NextResponse.json({ error: "Signatur ungültig oder abgelaufen" }, { status: 401 });
  }

  try {
    const customer = await findOrCreateCustomerForTelegramUser(valid.user);
    await setWebAppSessionCookie(customer.id);
    return NextResponse.json({
      ok: true,
      customer: {
        id:       customer.id,
        vorname:  customer.vorname,
        nachname: customer.nachname,
        email:    customer.email,
      },
    });
  } catch (err) {
    console.error("[/api/telegram/auth]", err);
    return NextResponse.json({ error: "Customer-Anlage fehlgeschlagen" }, { status: 500 });
  }
}
