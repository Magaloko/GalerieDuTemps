"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/config";
import { getBotInfo, setWebhook, deleteWebhook, getWebhookInfo } from "@/lib/telegram/client";

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

  // Webhook bei Telegram registrieren
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://galerie.apps.dadakaev.tech";
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook/${webhookSecret}`;
  try {
    await setWebhook(token, webhookUrl, webhookSecret);
  } catch (err) {
    return { ok: false, error: `Регистрация webhook не удалась: ${err instanceof Error ? err.message : "неизвестно"}` };
  }

  revalidatePath("/admin/einstellungen/telegram");
  return { ok: true, message: `Бот @${bot.username} подключён, webhook активен.` };
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
      `Pending Updates: ${info.pending_update_count}`,
    ];
    if (info.last_error_message) {
      lines.push(`⚠ Последняя ошибка: ${info.last_error_message}${info.last_error_date ? ` (${new Date(info.last_error_date * 1000).toLocaleString("ru-RU")})` : ""}`);
    }
    return { ok: true, message: lines.join("\n") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Проверка не удалась" };
  }
}
