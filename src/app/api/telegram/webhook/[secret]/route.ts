import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { leadAusKanalErstellen } from "@/lib/db/leads";
import { notifyNewLead } from "@/lib/notifications/lead-notify";
import {
  customerTelegramVerknuepfen,
  customerByTelegramChatId,
} from "@/lib/db/customer-telegram";
import {
  sendMessage,
  answerPreCheckoutQuery,
  answerCallbackQuery,
  type InlineKeyboardMarkup,
} from "@/lib/telegram/client";
import { handleCustomerCommand } from "@/lib/telegram/customer-commands";
import { handleSuccessfulPayment } from "@/lib/telegram/payment-handler";
import { getSiteUrl } from "@/lib/site-url";
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
 * Update-Typen die wir behandeln:
 *  - pre_checkout_query / successful_payment → Payment-Pfad
 *  - callback_query (Inline-Button-Klicks) → callback-handler
 *  - message mit text → /command-Routing oder Lead-Erstellung
 *
 * Alle User-facing-Strings sind auf Russisch (Hauptzielsprache des Shops).
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

  const siteBase = getSiteUrl();

  // ── Payments-Pfad ──────────────────────────────────────────────────────
  if (update.pre_checkout_query && konto.access_token) {
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

  // ── Callback-Query (Inline-Button-Klick) ───────────────────────────────
  if (update.callback_query && konto.access_token) {
    await handleCallbackQuery(update.callback_query, konto.access_token, siteBase)
      .catch(err => console.error("[tg callback_query]", err));
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

  // ── /start [<token>] ─────────────────────────────────────────────────────
  if (text.startsWith("/start")) {
    const param = text.slice("/start".length).trim().split(/\s+/)[0];

    // a) Deep-Link mit Token → Customer-Verknüpfung
    if (param && param.length >= 16) {
      const customer = await customerTelegramVerknuepfen(param, chat.id, username);
      if (customer && konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `✓ <b>Аккаунт привязан</b>\n\n` +
          `Привет, ${escapeHtml(customer.vorname ?? customer.email)}! ` +
          `Теперь вы будете получать сюда подтверждения заказов, статусы доставки и важные обновления.\n\n` +
          `Команды бота:\n` +
          `/orders — последние заказы\n` +
          `/status — детали заказа\n` +
          `/help — все команды\n\n` +
          `Отвязать аккаунт в любой момент: /unlink`,
          {
            parse_mode: "HTML",
            reply_markup: buildLinkedMainMenu(siteBase),
          },
        ).catch(err => console.error("[tg send verify]", err));
      } else if (konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `⚠ Токен недействителен или уже использован.\n\n` +
          `Сгенерируйте новую ссылку в профиле на сайте.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "Открыть профиль", url: `${siteBase}/kunde/profil` },
              ]],
            },
          },
        ).catch(err => console.error("[tg send fail]", err));
      }
      return NextResponse.json({ ok: true });
    }

    // b) /start ohne Parameter → Welcome (mit Status-Hinweis falls schon linked)
    if (konto.access_token) {
      const linked = await customerByTelegramChatId(chat.id).catch(() => null);
      const welcomeText = linked
        ? `<b>Galerie du Temps</b>\n\n` +
          `Вы уже привязаны, ${escapeHtml(linked.vorname ?? linked.email)}.\n\n` +
          `Чем могу помочь?`
        : `<b>Galerie du Temps</b>\n` +
          `<i>Кураторская галерея винтажа в Алматы.</i>\n\n` +
          `Я бот-помощник магазина. Могу:\n` +
          `• показать каталог\n` +
          `• ответить на вопросы\n` +
          `• передать сообщение куратору\n\n` +
          `Привяжите аккаунт, чтобы получать уведомления о заказах.`;
      await sendMessage(
        konto.access_token,
        chat.id,
        welcomeText,
        {
          parse_mode: "HTML",
          reply_markup: linked
            ? buildLinkedMainMenu(siteBase)
            : buildPublicMainMenu(siteBase),
        },
      ).catch(err => console.error("[tg send welcome]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── /unlink ─────────────────────────────────────────────────────────────
  if (text === "/unlink") {
    const customer = await customerByTelegramChatId(chat.id);
    if (customer) {
      const { customerTelegramLoesen } = await import("@/lib/db/customer-telegram");
      await customerTelegramLoesen(customer.id);
      if (konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `✓ Аккаунт отвязан. Уведомления больше не будут приходить.\n\n` +
          `В любой момент можно подключить снова через профиль на сайте.`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "Открыть сайт", url: siteBase },
              ]],
            },
          },
        ).catch(err => console.error("[tg send unlink]", err));
      }
    } else if (konto.access_token) {
      await sendMessage(
        konto.access_token,
        chat.id,
        `Аккаунт не привязан — отвязывать нечего. Используйте /start для начала.`,
      ).catch(err => console.error("[tg send unlink-empty]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── /menu — Inline-Keyboard mit Hauptaktionen (auch für nicht-linked) ──
  if (text === "/menu") {
    if (konto.access_token) {
      const linked = await customerByTelegramChatId(chat.id).catch(() => null);
      await sendMessage(
        konto.access_token,
        chat.id,
        `<b>Меню</b>`,
        {
          parse_mode: "HTML",
          reply_markup: linked
            ? buildLinkedMainMenu(siteBase)
            : buildPublicMainMenu(siteBase),
        },
      ).catch(err => console.error("[tg send menu]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── /shop — Mini-App-Launcher (web_app-Button öffnet im Telegram-WebView) ─
  if (text === "/shop" || text === "/магазин") {
    if (konto.access_token) {
      await sendMessage(
        konto.access_token,
        chat.id,
        `🛍 <b>Магазин в Telegram</b>\n\n` +
        `<i>Открой каталог прямо здесь — оплата, доставка, всё в одном окне.</i>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛍 Открыть магазин", web_app: { url: `${siteBase}/tg` } }],
              [{ text: "Открыть в браузере", url: `${siteBase}/katalog` }],
            ],
          },
        },
      ).catch(err => console.error("[tg send shop]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── /katalog — Web-Links (без Mini-App, для пользователей которые
  // предпочитают полную версию сайта) ───────────────────────────────────
  if (text === "/katalog" || text === "/каталог") {
    if (konto.access_token) {
      await sendMessage(
        konto.access_token,
        chat.id,
        `🛍 <b>Каталог Galerie du Temps</b>\n\n` +
        `<i>Новые поступления каждую среду.</i>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛍 Открыть в Telegram", web_app: { url: `${siteBase}/tg` } }],
              [{ text: "Все товары",            url: `${siteBase}/katalog` }],
              [{ text: "Категории",             url: `${siteBase}/kategorien` }],
              [{ text: "Журнал",                url: `${siteBase}/journal` }],
            ],
          },
        },
      ).catch(err => console.error("[tg send katalog]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── /kontakt — public Kontaktdaten ──────────────────────────────────────
  if (text === "/kontakt" || text === "/contact" || text === "/контакт") {
    if (konto.access_token) {
      await sendMessage(
        konto.access_token,
        chat.id,
        `<b>Связаться с нами</b>\n\n` +
        `Алматы, Казахстан\n` +
        `bonjour@galeriedutemps.kz\n\n` +
        `Или напишите прямо здесь — мы передадим сообщение куратору.`,
        { parse_mode: "HTML" },
      ).catch(err => console.error("[tg send kontakt]", err));
    }
    return NextResponse.json({ ok: true });
  }

  // ── Bekannter Customer → Commands oder Ack ─────────────────────────────
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

    // Nicht-Command → Ack + bietet Menü
    await sendMessage(
      konto.access_token,
      chat.id,
      `Спасибо за сообщение, ${escapeHtml(linkedCustomer.vorname ?? "—")}!\n\n` +
      `Я бот и не могу отвечать на свободные вопросы. Используйте /menu для команд ` +
      `или напишите куратору: bonjour@galeriedutemps.kz`,
      {
        reply_markup: buildLinkedMainMenu(siteBase),
      },
    ).catch(err => console.error("[tg send ack]", err));
    return NextResponse.json({ ok: true });
  }

  // ── Unbekannter Absender → als Lead in Inbox + Ack ──────────────────────
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

      // Acknowledgment damit User weiß dass Nachricht angekommen ist
      if (konto.access_token) {
        await sendMessage(
          konto.access_token,
          chat.id,
          `✓ Получили ваше сообщение — куратор скоро ответит.\n\n` +
          `А пока — посмотрите каталог: /katalog`,
          {
            reply_markup: buildPublicMainMenu(siteBase),
          },
        ).catch(err => console.error("[tg ack lead]", err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook]", err);
    return NextResponse.json({ ok: false, error: "internal" });
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Callback-Query-Handler — verarbeitet Inline-Button-Klicks.
 *
 * Convention: callback_data = "action:param" (max 64 bytes Telegram-Limit).
 *
 * Aktuell unterstützte Aktionen:
 *  - "orders"   → simuliert /orders
 *  - "menu"     → zeigt Hauptmenü erneut
 *  - "help"     → zeigt Help
 *
 * Wir antworten IMMER auf den callback_query damit der „Lade-Spinner" auf
 * dem Button verschwindet (10s Frist von Telegram, sonst Hänger-UI).
 * ────────────────────────────────────────────────────────────────────────── */
async function handleCallbackQuery(
  cq: NonNullable<TelegramUpdate["callback_query"]>,
  botToken: string,
  siteBase: string,
): Promise<void> {
  const chatId = cq.message?.chat.id;
  const data   = cq.data ?? "";

  // Immer zuerst ACKnowledgen, sonst spinnt Telegram
  await answerCallbackQuery(botToken, cq.id).catch(() => {});

  if (!chatId) return;

  if (data === "menu") {
    const linked = await customerByTelegramChatId(chatId).catch(() => null);
    await sendMessage(botToken, chatId, `<b>Меню</b>`, {
      parse_mode:   "HTML",
      reply_markup: linked ? buildLinkedMainMenu(siteBase) : buildPublicMainMenu(siteBase),
    }).catch(err => console.error("[cb menu]", err));
    return;
  }

  if (data === "help") {
    const linked = await customerByTelegramChatId(chatId).catch(() => null);
    const text = linked
      ? `<b>Команды бота</b>\n\n` +
        `/orders — последние заказы\n` +
        `/status &lt;номер&gt; — детали заказа\n` +
        `/wishlist — избранное\n` +
        `/menu — меню\n` +
        `/unlink — отвязать аккаунт`
      : `<b>Помощь</b>\n\n` +
        `/start — начать\n` +
        `/katalog — каталог\n` +
        `/kontakt — связаться\n` +
        `/menu — меню\n\n` +
        `Привяжите аккаунт через профиль на сайте, чтобы получать уведомления о заказах.`;
    await sendMessage(botToken, chatId, text, { parse_mode: "HTML" })
      .catch(err => console.error("[cb help]", err));
    return;
  }

  if (data === "orders") {
    const customer = await customerByTelegramChatId(chatId).catch(() => null);
    if (!customer) {
      await sendMessage(botToken, chatId,
        `Сначала привяжите аккаунт через профиль на сайте.`,
        { reply_markup: { inline_keyboard: [[{ text: "Открыть профиль", url: `${siteBase}/kunde/profil` }]] } },
      ).catch(() => {});
      return;
    }
    await handleCustomerCommand("/orders", { botToken, chatId, customer })
      .catch(err => console.error("[cb orders]", err));
    return;
  }

  // Unbekannter callback — silent ignore (ACK schon gesendet)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Inline-Keyboard-Builder
 * ────────────────────────────────────────────────────────────────────────── */

function buildPublicMainMenu(siteBase: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🛍 Открыть магазин", web_app: { url: `${siteBase}/tg` } }],
      [
        { text: "📰 Журнал",  url: `${siteBase}/journal` },
        { text: "✉ Контакт", callback_data: "help" },
      ],
      [{ text: "👤 Привязать аккаунт", url: `${siteBase}/kunde/profil` }],
    ],
  };
}

function buildLinkedMainMenu(siteBase: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🛍 Открыть магазин", web_app: { url: `${siteBase}/tg` } }],
      [{ text: "📋 Мои заказы", callback_data: "orders" }],
      [
        { text: "❤ Избранное", url: `${siteBase}/wunschliste` },
        { text: "👤 Профиль",  url: `${siteBase}/kunde/profil` },
      ],
      [{ text: "❓ Помощь", callback_data: "help" }],
    ],
  };
}

/** Minimaler HTML-Escape für sendMessage parse_mode="HTML" */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, c =>
    c === "&" ? "&amp;" :
    c === "<" ? "&lt;"  :
    c === ">" ? "&gt;"  :
                "&quot;"
  );
}
