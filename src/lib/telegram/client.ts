// ---------------------------------------------------------------------------
// Telegram Bot API — minimaler fetch-Wrapper
// Docs: https://core.telegram.org/bots/api
// ---------------------------------------------------------------------------

const TG_BASE = "https://api.telegram.org";

export interface TelegramUser {
  id:         number;
  is_bot:     boolean;
  first_name: string;
  last_name?: string;
  username?:  string;
  language_code?: string;
}

export interface TelegramChat {
  id:    number;
  type:  "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?:  string;
}

export interface TelegramMessage {
  message_id: number;
  from?:      TelegramUser;
  chat:       TelegramChat;
  date:       number;
  text?:      string;
  caption?:   string;
  photo?:     Array<{ file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }>;
  document?:  { file_id: string; file_unique_id: string; file_name?: string; mime_type?: string; file_size?: number };
}

export interface TelegramUpdate {
  update_id: number;
  message?:        TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?:   TelegramMessage;
  callback_query?: { id: string; from: TelegramUser; message?: TelegramMessage; data?: string };
}

async function callApi<T = unknown>(token: string, method: string, body?: object): Promise<T> {
  const r = await fetch(`${TG_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:   body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!data.ok) {
    throw new Error(`Telegram API ${method} fehlgeschlagen: ${data.description ?? r.statusText}`);
  }
  return data.result as T;
}

/** Bot-Profil-Info — zur Validierung dass der Token gültig ist */
export async function getBotInfo(token: string): Promise<TelegramUser> {
  return callApi<TelegramUser>(token, "getMe");
}

/** Webhook registrieren mit Secret-Path-Token */
export async function setWebhook(token: string, url: string, secret_token?: string): Promise<boolean> {
  return callApi<boolean>(token, "setWebhook", {
    url,
    secret_token,
    allowed_updates: ["message", "edited_message", "channel_post"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(token: string): Promise<boolean> {
  return callApi<boolean>(token, "deleteWebhook", { drop_pending_updates: true });
}

export interface WebhookInfo {
  url:           string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export async function getWebhookInfo(token: string): Promise<WebhookInfo> {
  return callApi<WebhookInfo>(token, "getWebhookInfo");
}

/** Nachricht senden — wird in Session 4 für Replies aus Admin gebraucht */
export async function sendMessage(token: string, chat_id: number | string, text: string, options?: {
  reply_to_message_id?: number;
  parse_mode?: "Markdown" | "HTML";
}): Promise<TelegramMessage> {
  return callApi<TelegramMessage>(token, "sendMessage", { chat_id, text, ...options });
}
