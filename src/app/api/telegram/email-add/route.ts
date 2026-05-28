import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInitData, loadBotTokenForAuth } from "@/lib/telegram/webapp-auth";
import { resolveTelegramIdentity } from "@/lib/telegram/role-resolver";
import { customerEmailHinzufuegen } from "@/lib/db/customer-telegram";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

const Schema = z.object({
  initData: z.string().min(20),
  email:    z.string().email(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/email-add
 *
 * Ein Telegram-first-Kunde ergänzt seine E-Mail im Profil.
 *  - E-Mail frei    → wird direkt am eigenen Konto gesetzt (unbestätigt).
 *  - E-Mail vergeben → { status: "claim-required" }: gehört einem bestehenden
 *    Web-Account. Der Client startet dann den Claim-Flow (/claim-init), der per
 *    Magic-Link bestätigt und die Konten zusammenführt (kein Auto-Merge).
 *
 * Rate-Limit: 5/10min/IP.
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`tg-email-add:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Укажите корректный e-mail." }, { status: 422 });

  const botToken = await loadBotTokenForAuth();
  if (!botToken) return NextResponse.json({ error: "Бот не настроен на сервере" }, { status: 503 });

  const valid = verifyInitData(parsed.data.initData, botToken);
  if (!valid) {
    return NextResponse.json(
      { error: "Подпись Telegram недействительна. Закройте Mini-App и откройте заново." },
      { status: 401 },
    );
  }

  const identity = await resolveTelegramIdentity(valid.user.id).catch(() => null);
  if (!identity || identity.role !== "customer" || !identity.customer) {
    return NextResponse.json({ error: "Сначала создайте профиль." }, { status: 403 });
  }

  const res = await customerEmailHinzufuegen(identity.customer.id, parsed.data.email);
  if (res.ok) {
    return NextResponse.json({ ok: true, status: "added" });
  }
  if (res.reason === "taken") {
    // Gehört einem bestehenden Account → Client startet Claim-Flow.
    return NextResponse.json({ ok: true, status: "claim-required" });
  }
  return NextResponse.json({ error: "Ошибка сохранения. Попробуйте позже." }, { status: 500 });
}
