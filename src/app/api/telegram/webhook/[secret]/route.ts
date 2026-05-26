import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { leadAusKanalErstellen } from "@/lib/db/leads";
import { notifyNewLead } from "@/lib/notifications/lead-notify";
import type { TelegramUpdate } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface KanalKonto {
  id:       number;
  account_id: string;
  username: string | null;
  webhook_verify_token: string;
}

/**
 * Telegram-Webhook-Endpoint.
 *
 * URL-Pattern: /api/telegram/webhook/[secret]
 * Der "secret" im Pfad wird beim Bot-Setup als webhook_verify_token in
 * sebo.kanal_konten gespeichert. Wir validieren in zwei Stufen:
 *  1. Pfad-Secret muss in DB existieren → kennt das Bot-Konto
 *  2. Optional: X-Telegram-Bot-Api-Secret-Token Header
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  // Kanal-Konto via Secret-Path identifizieren
  const kanalRes = await query<KanalKonto>(
    `SELECT id, account_id, username, webhook_verify_token
     FROM sebo.kanal_konten
     WHERE kanal = 'telegram' AND webhook_verify_token = $1 AND aktiv = true
     LIMIT 1`,
    [secret]
  );
  const konto = kanalRes.rows[0];
  if (!konto) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }

  // Optional Header-Secret-Token-Check (Telegram setzt das wenn beim setWebhook
  // angegeben). Sicherheitsschicht 2.
  const headerToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (headerToken && headerToken !== konto.webhook_verify_token) {
    return NextResponse.json({ error: "Invalid secret token" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Wir interessieren uns aktuell nur für eingehende Nachrichten
  const msg = update.message ?? update.edited_message ?? update.channel_post;
  if (!msg || (!msg.text && !msg.caption)) {
    // OK quittieren — kein Lead daraus
    return NextResponse.json({ ok: true });
  }

  const text     = msg.text ?? msg.caption ?? "";
  const from     = msg.from;
  const chat     = msg.chat;
  const externe  = `tg:${chat.id}:${msg.message_id}`;
  const handle   = from?.username ? `@${from.username}` : `tg:${chat.id}`;
  const name     = from
    ? [from.first_name, from.last_name].filter(Boolean).join(" ")
    : chat.title ?? handle;

  try {
    const { id: leadId, created } = await leadAusKanalErstellen({
      quelle:         "telegram",
      kanal_konto_id: konto.id,
      externe_id:     externe,
      kontakt_handle: handle,
      kontakt_name:   name,
      text,
      vorschau:       text.slice(0, 240),
      raw_payload:    update,
    });

    if (created) {
      // Best-Effort: Notifications & weitere Hooks asynchron
      notifyNewLead({
        id:             leadId,
        quelle:         "telegram",
        kontakt_name:   name,
        kontakt_email:  null,
        kontakt_handle: handle,
        betreff:        null,
        vorschau:       text.slice(0, 240),
        produkt_id:     null,
      }).catch(err => console.error("[notify]", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    // Trotz Fehler 200 zurück damit Telegram nicht re-tried bis crash
    return NextResponse.json({ ok: false, error: "internal" });
  }
}
