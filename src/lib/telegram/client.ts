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

export interface TelegramShippingAddress {
  country_code: string; state: string; city: string;
  street_line1: string; street_line2: string; post_code: string;
}

export interface TelegramPreCheckoutQuery {
  id:                 string;
  from:               TelegramUser;
  currency:           string;
  total_amount:       number;
  invoice_payload:    string;
  shipping_option_id?: string;
  order_info?: { name?: string; phone_number?: string; email?: string; shipping_address?: TelegramShippingAddress };
}

export interface TelegramSuccessfulPayment {
  currency:                   string;
  total_amount:               number;
  invoice_payload:            string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
  order_info?: { name?: string; phone_number?: string; email?: string; shipping_address?: TelegramShippingAddress };
}

export interface TelegramUpdate {
  update_id: number;
  message?:        TelegramMessage & { successful_payment?: TelegramSuccessfulPayment };
  edited_message?: TelegramMessage;
  channel_post?:   TelegramMessage;
  callback_query?: { id: string; from: TelegramUser; message?: TelegramMessage; data?: string };
  pre_checkout_query?: TelegramPreCheckoutQuery;
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

/**
 * Telegram Payments — sendInvoice
 *
 * Schickt einem Chat eine native Payment-Aufforderung. Telegram zeigt sein
 * eigenes Bezahl-Sheet mit Provider-Karte/Apple-Pay/etc.
 *
 * provider_token bekommt man via BotFather → /mybots → Payments. Pro Land
 * unterschiedliche Provider: Stripe (global), KASPI (für KZ), etc.
 *
 * Spec: https://core.telegram.org/bots/api#sendinvoice
 */
export interface InvoiceLabeledPrice { label: string; amount: number }   // amount in minor units (kopejka/cent)

export async function sendInvoice(
  token: string,
  params: {
    chat_id:        number;
    title:          string;
    description:    string;
    payload:        string;                            // wird zurückgeschickt beim successful_payment, max 128 bytes
    provider_token: string;
    currency:       string;                            // ISO 4217 — "KZT", "USD", "EUR", "RUB"
    prices:         InvoiceLabeledPrice[];
    need_name?:           boolean;
    need_email?:          boolean;
    need_shipping_address?: boolean;
    is_flexible?:         boolean;
    photo_url?:           string;
    start_parameter?:     string;
  },
): Promise<TelegramMessage> {
  return callApi<TelegramMessage>(token, "sendInvoice", params);
}

/**
 * Antwort auf pre_checkout_query.
 * Wird gerufen direkt vor dem tatsächlichen Zahlungs-Abbuchen — letzte
 * Chance um Lagerbestand, Bezahl-Möglichkeit etc. zu prüfen.
 */
export async function answerPreCheckoutQuery(
  token: string,
  pre_checkout_query_id: string,
  ok: boolean,
  error_message?: string,
): Promise<boolean> {
  return callApi<boolean>(token, "answerPreCheckoutQuery", {
    pre_checkout_query_id,
    ok,
    error_message,
  });
}
