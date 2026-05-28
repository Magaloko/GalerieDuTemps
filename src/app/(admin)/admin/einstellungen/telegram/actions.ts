"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/config";
import {
  adminTelegramTokenGenerieren,
  adminTelegramLoesen,
  adminGetTelegramStatus,
} from "@/lib/db/admin-telegram";
import {
  getBotInfo, setWebhook, deleteWebhook, getWebhookInfo, setMyCommands,
  setChatMenuButton, resetChatMenuButton,
} from "@/lib/telegram/client";
import { getSiteUrl } from "@/lib/site-url";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

interface KontoRow {
  id:       number;
  username: string | null;
  account_id: string | null;
  webhook_verify_token: string | null;
}

async function findeTelegramKonto(): Promise<KontoRow | null> {
  const r = await query<KontoRow>(
    `SELECT id, username, account_id, webhook_verify_token
     FROM sebo.kanal_konten
     WHERE kanal = 'telegram'
     ORDER BY id DESC LIMIT 1`
  );
  return r.rows[0] ?? null;
}

export async function telegramVerbindenAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const token = String(formData.get("token") ?? "").trim();
  if (!/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
    return { ok: false, error: "Некорректный формат токена (ожидается: 1234567890:ABC...)" };
  }

  // Token gegen Telegram validieren (mit getMe)
  let bot;
  try {
    bot = await getBotInfo(token);
  } catch (err) {
    return { ok: false, error: `Проверка токена не удалась: ${err instanceof Error ? err.message : "неизвестно"}` };
  }

  // Webhook-Secret generieren (Path-Component → Random-Hex)
  const webhookSecret = randomBytes(24).toString("hex");

  // In DB speichern (upsert auf account_id)
  await query(
    `INSERT INTO sebo.kanal_konten
       (kanal, account_id, username, access_token, webhook_verify_token, aktiv, meta)
     VALUES ('telegram', $1, $2, $3, $4, true, $5::jsonb)
     ON CONFLICT (kanal, account_id) DO UPDATE
       SET username             = EXCLUDED.username,
           access_token         = EXCLUDED.access_token,
           webhook_verify_token = EXCLUDED.webhook_verify_token,
           aktiv                = true,
           meta                 = EXCLUDED.meta`,
    [
      String(bot.id),
      bot.username ?? null,
      token,
      webhookSecret,
      JSON.stringify({ first_name: bot.first_name, bot_id: bot.id }),
    ]
  );

  // Webhook bei Telegram registrieren — Base-URL aus getSiteUrl()
  // (zieht aus NEXT_PUBLIC_SITE_URL bzw NEXTAUTH_URL bzw VERCEL_URL,
  // mit konsistentem Fallback). Das war vorher inkonsistent verstreut.
  const webhookUrl = `${getSiteUrl()}/api/telegram/webhook/${webhookSecret}`;
  try {
    await setWebhook(token, webhookUrl, webhookSecret);
  } catch (err) {
    return { ok: false, error: `Регистрация webhook не удалась: ${err instanceof Error ? err.message : "неизвестно"}` };
  }

  // setMyCommands: füllt das „/" Menü im Telegram-Client. Best-effort —
  // wenn das fehlschlägt, ist der Bot trotzdem nutzbar, nur ohne Auto-
  // Vorschläge in der Client-UI.
  await setMyCommands(token, [
    { command: "start",    description: "Запустить бота" },
    { command: "shop",     description: "Открыть магазин" },
    { command: "menu",     description: "Главное меню" },
    { command: "katalog",  description: "Каталог товаров" },
    { command: "orders",   description: "Мои заказы" },
    { command: "status",   description: "Детали заказа: /status GDT-0042" },
    { command: "wishlist", description: "Избранное" },
    { command: "kontakt",  description: "Связаться с куратором" },
    { command: "help",     description: "Помощь и команды" },
    { command: "unlink",   description: "Отвязать аккаунт" },
  ]).catch(err => console.warn("[telegram setMyCommands]", err));

  // Mini-App Menu-Button — der „🛍 Магазин"-Knopf links unten im Chat.
  // Best-effort: wenn das fehlschlägt, ist der Bot trotzdem funktional,
  // nur ohne den prominenten WebApp-Launcher.
  const miniAppUrl = `${getSiteUrl()}/tg`;
  await setChatMenuButton(token, "🛍 Магазин", miniAppUrl)
    .catch(err => console.warn("[telegram setChatMenuButton]", err));

  revalidatePath("/admin/einstellungen/telegram");
  return {
    ok: true,
    message:
      `Бот @${bot.username} подключён.\n` +
      `Webhook: ${webhookUrl}\n` +
      `Меню команд установлено.\n` +
      `Mini-App: ${miniAppUrl}`,
  };
}

export async function telegramTrennenAction(): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const konto = await findeTelegramKonto();
  if (!konto) return { ok: false, error: "Аккаунт не подключён" };

  // Token aus DB holen für deleteWebhook-Call
  const tokRes = await query<{ access_token: string }>(
    `SELECT access_token FROM sebo.kanal_konten WHERE id = $1`,
    [konto.id]
  );
  const token = tokRes.rows[0]?.access_token;
  if (token) {
    try { await deleteWebhook(token); } catch { /* best-effort */ }
  }

  await query(`UPDATE sebo.kanal_konten SET aktiv = false WHERE id = $1`, [konto.id]);
  revalidatePath("/admin/einstellungen/telegram");
  return { ok: true, message: "Бот отключён." };
}

export async function telegramWebhookCheckAction(): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const konto = await findeTelegramKonto();
  if (!konto) return { ok: false, error: "Аккаунт не подключён" };

  const tokRes = await query<{ access_token: string }>(
    `SELECT access_token FROM sebo.kanal_konten WHERE id = $1`,
    [konto.id]
  );
  const token = tokRes.rows[0]?.access_token;
  if (!token) return { ok: false, error: "Токен отсутствует" };

  try {
    const info = await getWebhookInfo(token);
    const lines = [
      `URL: ${info.url || "(не задан)"}`,
      `Ожидающих апдейтов: ${info.pending_update_count}`,
    ];
    if (info.last_error_message) {
      lines.push(
        `⚠ Последняя ошибка: ${info.last_error_message}` +
        (info.last_error_date
          ? ` (${new Date(info.last_error_date * 1000).toLocaleString("ru-RU")})`
          : "")
      );
      lines.push(
        `\nЕсли ошибка повторяется — нажмите «Перерегистрировать webhook».`
      );
    } else {
      lines.push(`✓ Ошибок нет, бот работает.`);
    }
    return { ok: true, message: lines.join("\n") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Проверка не удалась" };
  }
}

/**
 * Re-registriert den Webhook unter der AKTUELLEN Site-URL + setzt
 * setMyCommands neu. Nützlich nach Domain-Wechsel oder wenn Telegram
 * den Webhook aus irgendeinem Grund (Cert-Probleme, Timeout-Spam etc.)
 * auf der Server-Seite verworfen hat.
 */
export async function telegramWebhookNeuRegistrierenAction(): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const konto = await findeTelegramKonto();
  if (!konto) return { ok: false, error: "Аккаунт не подключён" };
  if (!konto.webhook_verify_token) return { ok: false, error: "Webhook-Token отсутствует — переподключите бота" };

  const tokRes = await query<{ access_token: string }>(
    `SELECT access_token FROM sebo.kanal_konten WHERE id = $1`,
    [konto.id]
  );
  const token = tokRes.rows[0]?.access_token;
  if (!token) return { ok: false, error: "Токен отсутствует" };

  const webhookUrl = `${getSiteUrl()}/api/telegram/webhook/${konto.webhook_verify_token}`;
  try {
    await setWebhook(token, webhookUrl, konto.webhook_verify_token);
  } catch (err) {
    return {
      ok: false,
      error: `Регистрация не удалась: ${err instanceof Error ? err.message : "неизвестно"}`,
    };
  }

  await setMyCommands(token, [
    { command: "start",    description: "Запустить бота" },
    { command: "shop",     description: "Открыть магазин" },
    { command: "menu",     description: "Главное меню" },
    { command: "katalog",  description: "Каталог товаров" },
    { command: "orders",   description: "Мои заказы" },
    { command: "status",   description: "Детали заказа: /status GDT-0042" },
    { command: "wishlist", description: "Избранное" },
    { command: "kontakt",  description: "Связаться с куратором" },
    { command: "help",     description: "Помощь и команды" },
    { command: "unlink",   description: "Отвязать аккаунт" },
  ]).catch(err => console.warn("[telegram setMyCommands]", err));

  // Mini-App Menu-Button auch hier neu setzen (gleiche URL = idempotent)
  const miniAppUrl = `${getSiteUrl()}/tg`;
  await setChatMenuButton(token, "🛍 Магазин", miniAppUrl)
    .catch(err => console.warn("[telegram setChatMenuButton]", err));

  revalidatePath("/admin/einstellungen/telegram");
  return {
    ok: true,
    message:
      `Webhook перерегистрирован: ${webhookUrl}\n` +
      `Меню команд обновлено.\n` +
      `Mini-App: ${miniAppUrl}`,
  };
}

/** Mini-App Menu-Button ausschalten — wenn Admin den nicht mehr will. */
export async function telegramMiniAppDeaktivierenAction(): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const konto = await findeTelegramKonto();
  if (!konto) return { ok: false, error: "Аккаунт не подключён" };

  const tokRes = await query<{ access_token: string }>(
    `SELECT access_token FROM sebo.kanal_konten WHERE id = $1`,
    [konto.id]
  );
  const token = tokRes.rows[0]?.access_token;
  if (!token) return { ok: false, error: "Токен отсутствует" };

  try {
    await resetChatMenuButton(token);
    return { ok: true, message: "Кнопка «Магазин» убрана. Теперь в чате будет показано меню команд." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Не удалось" };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Persönliche Admin-Telegram-Verknüpfung (für Notifications + Admin-Mini-App)
 * ────────────────────────────────────────────────────────────────────────── */

export type AdminLinkResult =
  | { ok: true; deepLink: string }
  | { ok: false; error: string };

/** Generiert OTP-Token + baut Deep-Link zum Bot für den eingeloggten Admin. */
export async function adminTelegramLinkGenerierenAction(): Promise<AdminLinkResult> {
  const session = await requireAdminSession();
  if (!session?.user?.id) return { ok: false, error: "Нет прав" };

  const konto = await findeTelegramKonto();
  if (!konto?.username) {
    return { ok: false, error: "Сначала подключите бота (токен выше)." };
  }

  try {
    const token    = await adminTelegramTokenGenerieren(session.user.id);
    const botUser  = konto.username.replace(/^@/, "");
    const deepLink = `https://t.me/${botUser}?start=${token}`;
    return { ok: true, deepLink };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Не удалось";
    // Häufigste Ursache: Migration 037 nicht angewendet
    if (msg.includes("telegram_link_token") || msg.includes("column")) {
      return { ok: false, error: "Примените миграцию 037_admin_telegram.sql." };
    }
    return { ok: false, error: msg };
  }
}

/** Status (verknüpft? welcher Username?) für die UI. */
export async function adminTelegramStatusAction(): Promise<{
  verknuepft: boolean; username: string | null;
}> {
  const session = await requireAdminSession();
  if (!session?.user?.id) return { verknuepft: false, username: null };
  try {
    const s = await adminGetTelegramStatus(session.user.id);
    return { verknuepft: !!s.chat_id, username: s.username };
  } catch {
    return { verknuepft: false, username: null };
  }
}

/** Eigene Telegram-Verknüpfung lösen. */
export async function adminTelegramTrennenAction(): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session?.user?.id) return { ok: false, error: "Нет прав" };
  try {
    await adminTelegramLoesen(session.user.id);
    return { ok: true, message: "Ваш Telegram отвязан." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Не удалось" };
  }
}
