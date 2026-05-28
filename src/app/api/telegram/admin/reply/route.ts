import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInitData, loadBotTokenForAuth } from "@/lib/telegram/webapp-auth";
import { benutzerByTelegramChatId } from "@/lib/telegram/role-resolver";
import { sendMessage } from "@/lib/telegram/client";
import {
  leadById,
  leadTelegramChatId,
  leadKommentarHinzufuegen,
  leadStatusAendern,
} from "@/lib/db/leads";
import { sendEmail } from "@/lib/email";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic     = "force-dynamic";
export const maxDuration = 15;

const Schema = z.object({
  initData: z.string().min(20),
  lead_id:  z.string().uuid(),
  text:     z.string().min(1).max(4000),
});

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/admin/reply
 *
 * Inline-Reply auf einen Lead direkt aus dem Mini-App-Admin-Inbox.
 *
 * Flow:
 *  1. initData verifizieren → Telegram-User-ID
 *  2. benutzerByTelegramChatId → muss Admin sein
 *  3. Lead laden, Reply-Kanal bestimmen:
 *     a) telegram-Lead → sendMessage via Bot an die chat_id des Leads
 *     b) Lead hat kontakt_email → sendEmail
 *     c) sonst → 422 (kein Reply-Kanal)
 *  4. lead_message (richtung=outbound) speichern
 *  5. Lead-Status → beantwortet
 *
 * Antwort an den Admin: { ok, channel: "telegram"|"email" }.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`tg-admin-reply:${ip}`, 60, 10 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", details: parsed.error.flatten() }, { status: 422 });
  }

  // ── Admin-Check ───────────────────────────────────────────────────────────
  const botToken = await loadBotTokenForAuth();
  if (!botToken) return NextResponse.json({ error: "Бот не настроен" }, { status: 503 });

  const valid = verifyInitData(parsed.data.initData, botToken);
  if (!valid) return NextResponse.json({ error: "Подпись недействительна" }, { status: 401 });

  const admin = await benutzerByTelegramChatId(valid.user.id);
  if (!admin) {
    return NextResponse.json({ error: "Только для администраторов" }, { status: 403 });
  }

  // ── Lead laden ──────────────────────────────────────────────────────────
  const lead = await leadById(parsed.data.lead_id);
  if (!lead) return NextResponse.json({ error: "Лид не найден" }, { status: 404 });

  // ── Reply-Kanal bestimmen ─────────────────────────────────────────────────
  const chatId = await leadTelegramChatId(parsed.data.lead_id);
  const email  = lead.kontakt_email ?? lead.customer_email ?? null;

  let channel: "telegram" | "email" | null = null;
  try {
    if (chatId) {
      await sendMessage(botToken, chatId,
        `<b>Galerie du Temps</b>\n\n${escapeHtml(parsed.data.text)}`,
        { parse_mode: "HTML" },
      );
      channel = "telegram";
    } else if (email) {
      await sendEmail({
        to:      [{ email }],
        subject: lead.betreff ? `Re: ${lead.betreff}` : "Ответ от Galerie du Temps",
        htmlContent: `<p>${escapeHtml(parsed.data.text).replace(/\n/g, "<br>")}</p>`,
        textContent: parsed.data.text,
        tags:    ["lead-reply"],
      });
      channel = "email";
    } else {
      return NextResponse.json(
        { error: "У этого лида нет канала для ответа (ни Telegram, ни e-mail)." },
        { status: 422 },
      );
    }
  } catch (err) {
    console.error("[tg-admin-reply send]", err);
    return NextResponse.json({ error: "Не удалось отправить ответ." }, { status: 500 });
  }

  // ── Persist: outbound-Message + Status ────────────────────────────────────
  await leadKommentarHinzufuegen(parsed.data.lead_id, parsed.data.text, admin.id, "outbound")
    .catch(err => console.error("[tg-admin-reply persist msg]", err));
  await leadStatusAendern(parsed.data.lead_id, "beantwortet", admin.id)
    .catch(err => console.error("[tg-admin-reply status]", err));

  return NextResponse.json({ ok: true, channel });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}
