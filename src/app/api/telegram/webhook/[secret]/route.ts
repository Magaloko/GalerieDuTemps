import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { leadAusKanalErstellen } from "@/lib/db/leads";
import { notifyNewLead } from "@/lib/notifications/lead-notify";
import {
  customerTelegramVerknuepfen,
  customerByTelegramChatId,
} from "@/lib/db/customer-telegram";
import { sendMessage, answerPreCheckoutQuery } from "@/lib/telegram/client";
import { handleCustomerCommand } from "@/lib/telegram/customer-commands";
import { handleSuccessfulPayment } from "@/lib/telegram/payment-handler";
import { webhookEventReserve } from "@/lib/db/webhook-events";
import type { TelegramUpdate } from "@/lib/telegram/client";

export const dynamic     = "force-dynamic";
export const maxDuration = 30;

interface KanalKonto {
  id:                   number;
  account_id:           string;
  username:             string | null;
  webhook_verify_token: string;
  access_token:         string | null;
}

/**
 * Telegram-Webhook-Endpoint.
 *
 * URL-Pattern: /api/telegram/webhook/[secret]
 * Validierung in zwei Stufen:
 *  1. Pfad-Secret muss in DB existieren
 *  2. Optional X-Telegram-Bot-Api-Secret-Token Header
 *
 * Message-Routing (Reihenfolge wichtig):
 *  a. /start <token>  → Customer-Verknüpfung (siehe customer-telegram.ts)
 *  b. /start          → Welcome-Message
 *  c. /unlink         → Customer-Entkopplung
 *  d. Bekannter Customer chat → Bestätigungs-Echo, KEIN Lead
 *  e. Unbekannter chat → Lead in Inbox (Original-Verhalten)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;

  const kanalRes = await query<KanalKonto>(
    `SELECT id, account_id, username, webhook_verify_token, access_token
     FROM sebo.kanal_konten
     WHERE kanal = 'telegram' AND webhook_verify_token = $1 AND aktiv = true
     LIMIT 1`,
    [secret]
  );
  const konto = kanalRes.rows[0];
  if (!konto) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  }

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

  // ── Payments-Pfad (pre_checkout_query + successful_payment) ────────────
  // Telegram schickt diese als separate update-Typen, BEVOR die normale
  // Message kommt. Müssen vor dem Lead-/Command-Routing behandelt werden.
  if (update.pre_checkout_query && konto.access_token) {
    // 10-Sekunden-Frist von Telegram zu antworten — wir bestätigen sofort
    // (Server-side-Validation lief schon beim sendInvoice-Aufruf).
    await answerPreCheckoutQuery(konto.access_token, update.pre_checkout_query.id, true)
      .catch(err => console.error("[tg pre_checkout]", err));
    return NextResponse.json({ ok: true });
  }
  if (update.message?.successful_payment && konto.access_token) {
    await handleSuccessfulPayment(
      update.message.successful_payment,
      update.message.chat.id,
      konto.access_token,
    ).catch(err => console.error("[tg successful_payment]", err));
    return NextResponse.json({ ok: true });
  }

  const msg = update.message ?? update.edited_message ?? update.channel_post;
  if (!msg || (!msg.text && !msg.caption)) {
    return NextResponse.json({ ok: true });
  }

  const text     = (msg.text ?? msg.caption ?? "").trim();
  const from     = msg.from;
  const chat     = msg.chat;
  const username = from?.username ?? null;

  // ── Route a/b: /start [<token>] ────────────────────────────────────────
  // Telegram-Konvention: nach /start kommt optional ein Parameter, separiert
  // durch Whitespace. Beim Deep-Link tg://resolve?domain=…&start=ABC wird das
  // ABC als „/start ABC" an den Bot geschickt.
  if (text.startsWith("/start")) {
    const param = text.slice("/start".length).trim().split(/\s+/)[0];
    if (param && param.length >= 16) {
      const customer = await customerTelegramVerknuepfen(param, chat.id, username);
      if (customer && konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `✓ Verknüpft mit deinem Galerie-du-Temps-Account.\n\n` +
          `Hallo ${customer.vorname ?? customer.email}! ` +
          `Ab jetzt bekommst du Bestellbestätigung, Versandstatus und ` +
          `wichtige Updates direkt hier per Nachricht.\n\n` +
          `Mit /unlink kannst du die Verknüpfung jederzeit aufheben.`,
        ).catch(err => console.error("[tg send verify]", err));
      } else if (konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `⚠ Token ungültig oder bereits verbraucht.\n\n` +
          `Generiere in deinem Profil (https://galeriedutemps.kz/kunde/profil) ` +
          `einen neuen Verknüpfungs-Link.`,
        ).catch(err => console.error("[tg send fail]", err));
      }
      return NextResponse.json({ ok: true });
    }

    // /start ohne Parameter → Welcome
    if (konto.access_token) {
      await sendMessage(
        konto.access_token,
        chat.id,
        `Galerie du Temps — Кураторская галерея винтажа в Алматы.\n\n` +
        `Чтобы получать уведомления о ваших заказах, привяжите аккаунт через ` +
        `профиль на сайте: https://galeriedutemps.kz/kunde/profil`,
      ).catch(err => console.error("[tg send welcome]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── Route c: /unlink ───────────────────────────────────────────────────
  if (text === "/unlink") {
    const customer = await customerByTelegramChatId(chat.id);
    if (customer) {
      const { customerTelegramLoesen } = await import("@/lib/db/customer-telegram");
      await customerTelegramLoesen(customer.id);
      if (konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `Verknüpfung aufgehoben. Du bekommst keine Notifications mehr von uns.\n\n` +
          `Wiederherstellen jederzeit über dein Profil auf der Website.`,
        ).catch(err => console.error("[tg send unlink]", err));
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Route d: bekannter Customer ─────────────────────────────────────────
  // Zuerst prüfen ob es ein Command ist (/orders, /status, /wishlist, /help).
  // Wenn ja → handle und fertig. Wenn nein → Acknowledgment senden.
  const linkedCustomer = await customerByTelegramChatId(chat.id);
  if (linkedCustomer && konto.access_token) {
    const wasCommand = await handleCustomerCommand(text, {
      botToken: konto.access_token,
      chatId:   chat.id,
      customer: linkedCustomer,
    });
    if (wasCommand) {
      return NextResponse.json({ ok: true });
    }

    // Nicht-Command-Message von verknüpftem Customer → Ack, KEIN Lead
    await sendMessage(
      konto.access_token,
      chat.id,
      `Danke für deine Nachricht, ${linkedCustomer.vorname ?? "—"}!\n\n` +
      `Befehle: /orders /status /help\n\n` +
      `Für persönliche Anfragen: bonjour@galeriedutemps.kz`,
    ).catch(err => console.error("[tg send ack]", err));
    return NextResponse.json({ ok: true });
  }

  // ── Route e: Unbekannter Absender → als Lead in Inbox ──────────────────
  const externe  = `tg:${chat.id}:${msg.message_id}`;
  const handle   = username ? `@${username}` : `tg:${chat.id}`;
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
    return NextResponse.json({ ok: false, error: "internal" });
  }
}
