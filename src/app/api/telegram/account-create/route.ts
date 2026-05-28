import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInitData, loadBotTokenForAuth } from "@/lib/telegram/webapp-auth";
import { customerAusTelegramErstellen } from "@/lib/db/customer-telegram";
import { setWebAppSessionCookieByRole } from "@/lib/telegram/webapp-session";
import { resolveTelegramIdentity } from "@/lib/telegram/role-resolver";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

const Schema = z.object({ initData: z.string().min(20) });

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/account-create
 *
 * 1-Tap-Konto-Erstellung für Telegram-first-Nutzer (opt-in aus /tg/profil).
 * Legt ein Konto an, das NUR an die telegram_chat_id gekoppelt ist (keine
 * E-Mail). Setzt danach den WebApp-Session-Cookie, sodass das Profil sofort
 * verfügbar ist. E-Mail kann der Nutzer später im Profil ergänzen.
 *
 * Idempotent: existiert schon ein Konto zu dieser chat_id, wird nur die
 * Session gesetzt. Admins werden abgewiesen (sie sind bereits benutzer).
 *
 * Rate-Limit: 5/10min/IP.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`tg-acc-create:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 422 });
  }

  const botToken = await loadBotTokenForAuth();
  if (!botToken) return NextResponse.json({ error: "Бот не настроен на сервере" }, { status: 503 });

  const valid = verifyInitData(parsed.data.initData, botToken);
  if (!valid) {
    return NextResponse.json(
      { error: "Подпись Telegram недействительна. Закройте Mini-App и откройте заново." },
      { status: 401 },
    );
  }

  try {
    const identity = await resolveTelegramIdentity(valid.user.id);

    // Admins haben bereits ein benutzer-Konto — kein Customer anlegen.
    if (identity.role === "admin") {
      return NextResponse.json({ error: "Этот Telegram привязан как администратор." }, { status: 409 });
    }

    const existing = identity.role === "customer" ? identity.customer : null;
    const customer = existing ?? await customerAusTelegramErstellen({
      chatId:   valid.user.id,
      username: valid.user.username ?? null,
      vorname:  valid.user.first_name ?? null,
    });

    await setWebAppSessionCookieByRole("customer", customer.id, valid.user.id);

    return NextResponse.json({
      ok:      true,
      created: !existing,
      user: {
        id:      customer.id,
        vorname: customer.vorname,
      },
    });
  } catch (err) {
    console.error("[account-create]", err);
    return NextResponse.json({ error: "Не удалось создать профиль. Попробуйте позже." }, { status: 500 });
  }
}
