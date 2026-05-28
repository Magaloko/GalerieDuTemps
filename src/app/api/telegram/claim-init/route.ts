import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyInitData,
  loadBotTokenForAuth,
} from "@/lib/telegram/webapp-auth";
import { claimInitiieren } from "@/lib/db/customer-telegram-claim";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

const Schema = z.object({
  initData: z.string().min(20),
  email:    z.string().email(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/claim-init
 *
 * Aufgerufen aus /tg/profil wenn der User seinen Telegram-Account mit
 * einem bestehenden Email-Account verknüpfen will.
 *
 * Body: { initData, email }
 *
 * Flow:
 *  1. initData via HMAC verifizieren → echte Telegram-User-ID
 *  2. claimInitiieren(email, chatId, username) — speichert pending claim
 *  3. Wenn ok: Magic-Link-Email an die angegebene Adresse
 *  4. Response immer „pending" (verschleiert ob E-Mail existiert, außer
 *    explizite Reject-Fälle wie „already-linked")
 *
 * Rate-Limit: 5/30min/IP — Spam-Schutz, E-Mail kostet Geld.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // Rate-Limit
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`tg-claim:${ip}`, 5, 30 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // ── initData verifizieren ────────────────────────────────────────────────
  const botToken = await loadBotTokenForAuth();
  if (!botToken) {
    return NextResponse.json(
      { error: "Бот не настроен на сервере" },
      { status: 503 },
    );
  }
  const valid = verifyInitData(parsed.data.initData, botToken);
  if (!valid) {
    return NextResponse.json(
      { error: "Подпись Telegram недействительна. Закройте Mini-App и откройте заново." },
      { status: 401 },
    );
  }

  // ── Claim initiieren ─────────────────────────────────────────────────────
  const result = await claimInitiieren(
    parsed.data.email,
    valid.user.id,
    valid.user.username ?? null,
  );

  if (!result.ok) {
    const errMap: Record<typeof result.error, { msg: string; status: number }> = {
      "no-customer": {
        msg: "Аккаунт с этой почтой не найден. Сначала зарегистрируйтесь на сайте.",
        status: 404,
      },
      "already-linked": {
        msg: "Этот аккаунт уже привязан к другому Telegram. Сначала отвяжите его на сайте: /kunde/profil.",
        status: 409,
      },
      "chat-id-busy": {
        msg: "Ваш Telegram уже привязан к другому аккаунту на сайте.",
        status: 409,
      },
      "db-error": {
        msg: "Ошибка базы данных. Попробуйте позже.",
        status: 500,
      },
    };
    const m = errMap[result.error];
    return NextResponse.json({ error: m.msg }, { status: m.status });
  }

  // ── Magic-Link-Email senden ──────────────────────────────────────────────
  const claimUrl = `${getSiteUrl()}/kunde/telegram-claim?token=${result.token}`;
  const display  = valid.user.username
    ? `@${valid.user.username}`
    : valid.user.first_name ?? "Telegram-аккаунт";

  await sendEmail({
    to:      [{ email: parsed.data.email.trim().toLowerCase() }],
    subject: "Привязка Telegram · Galerie du Temps",
    htmlContent: htmlTemplate({ claimUrl, display }),
    textContent: textTemplate({ claimUrl, display }),
    tags:    ["telegram-claim"],
  });

  return NextResponse.json({
    ok:          true,
    emailMasked: result.emailMasked,
    expiresMin:  15,
  });
}

/* ── Email-Templates (inline — kein separater file für 1 use case) ───────── */

function htmlTemplate({ claimUrl, display }: { claimUrl: string; display: string }): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Привязка Telegram</title></head>
<body style="margin:0;background:#F5F1EA;font-family:Georgia,serif;color:#0C0A08;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border:1px solid rgba(44,36,32,0.12);" cellpadding="0" cellspacing="0">
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#E8703A;">✦ Привязка Telegram</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:400;line-height:1.2;">Подтвердите привязку</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:rgba(12,10,8,0.7);font-style:italic;">
            Запрос на привязку Telegram-аккаунта <strong style="color:#0C0A08;font-style:normal;">${escapeHtml(display)}</strong>
            к этому почтовому адресу.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${claimUrl}"
               style="display:inline-block;padding:14px 28px;background:#E8703A;color:#fff;text-decoration:none;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-family:Arial,sans-serif;">
              Подтвердить
            </a>
          </p>
          <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:rgba(12,10,8,0.55);">
            Ссылка действительна 15 минут. Если вы не запрашивали привязку — просто проигнорируйте письмо.
          </p>
          <p style="margin:0;font-size:11px;color:rgba(12,10,8,0.4);word-break:break-all;">
            ${claimUrl}
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(12,10,8,0.4);">
        Galerie du Temps · Алматы
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function textTemplate({ claimUrl, display }: { claimUrl: string; display: string }): string {
  return [
    `GALERIE DU TEMPS · Привязка Telegram`,
    ``,
    `Подтвердите привязку Telegram-аккаунта ${display} к вашему аккаунту.`,
    ``,
    `Подтвердить: ${claimUrl}`,
    ``,
    `Ссылка действительна 15 минут.`,
    `Если вы не запрашивали привязку — просто проигнорируйте письмо.`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  : "&quot;"
  );
}
