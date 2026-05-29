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
  media_group_id?: string;   // gesetzt wenn die Nachricht Teil eines Albums ist
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

export interface TelegramCallbackQuery {
  id:       string;
  from:     TelegramUser;
  message?: TelegramMessage;
  data?:    string;
  chat_instance: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?:        TelegramMessage & { successful_payment?: TelegramSuccessfulPayment };
  edited_message?: TelegramMessage;
  channel_post?:   TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  pre_checkout_query?: TelegramPreCheckoutQuery;
}

/** Inline-Keyboard-Button — URL-Link, Callback-Data, oder WebApp-Launcher. */
export type InlineKeyboardButton =
  | { text: string; url:           string }
  | { text: string; callback_data: string }
  | { text: string; web_app:       { url: string } };

export type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

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

/** File-Metadaten holen (file_path für Download). */
export async function getFile(token: string, file_id: string): Promise<{ file_id: string; file_path?: string; file_size?: number }> {
  return callApi(token, "getFile", { file_id });
}

/** Telegram-Datei als Buffer herunterladen (z.B. ein gesendetes Foto).
 *  file_path kommt aus getFile(). */
export async function downloadTelegramFile(token: string, file_path: string): Promise<Buffer> {
  const r = await fetch(`${TG_BASE}/file/bot${token}/${file_path}`);
  if (!r.ok) throw new Error(`Telegram file download failed: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Webhook registrieren mit Secret-Path-Token.
 *  WICHTIG: allowed_updates muss callback_query enthalten damit Inline-Button-
 *  Klicks ankommen, und pre_checkout_query + successful_payment für Telegram-
 *  Payments. Ohne explizite Liste sendet Telegram alle DEFAULT-Updates —
 *  callback_query und pre_checkout_query sind aber NICHT default. */
export async function setWebhook(token: string, url: string, secret_token?: string): Promise<boolean> {
  return callApi<boolean>(token, "setWebhook", {
    url,
    secret_token,
    allowed_updates: [
      "message",
      "edited_message",
      "channel_post",
      "callback_query",
      "pre_checkout_query",
    ],
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

/** Nachricht senden mit optionalem Inline-Keyboard. */
export async function sendMessage(token: string, chat_id: number | string, text: string, options?: {
  reply_to_message_id?: number;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}): Promise<TelegramMessage> {
  return callApi<TelegramMessage>(token, "sendMessage", { chat_id, text, ...options });
}

/** Bestehende Bot-Message updaten (z.B. nach Button-Klick). */
export async function editMessageText(token: string, chat_id: number | string, message_id: number, text: string, options?: {
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}): Promise<TelegramMessage | boolean> {
  return callApi<TelegramMessage | boolean>(token, "editMessageText", {
    chat_id, message_id, text, ...options,
  });
}

/** Foto schicken — URL ODER file_id. Caption supports HTML.
 *  Spec: https://core.telegram.org/bots/api#sendphoto */
export async function sendPhoto(
  token: string,
  chat_id: number | string,
  photo: string,             // public URL or telegram file_id
  options?: {
    caption?:      string;
    parse_mode?:   "Markdown" | "HTML";
    reply_markup?: InlineKeyboardMarkup;
  },
): Promise<TelegramMessage> {
  return callApi<TelegramMessage>(token, "sendPhoto", {
    chat_id, photo, ...options,
  });
}

/** Animation (GIF/MP4) schicken — für animierte Welcomes/Drops.
 *  Spec: https://core.telegram.org/bots/api#sendanimation */
export async function sendAnimation(
  token: string,
  chat_id: number | string,
  animation: string,         // public URL or file_id
  options?: {
    caption?:      string;
    parse_mode?:   "Markdown" | "HTML";
    reply_markup?: InlineKeyboardMarkup;
  },
): Promise<TelegramMessage> {
  return callApi<TelegramMessage>(token, "sendAnimation", {
    chat_id, animation, ...options,
  });
}

/** Callback-Query bestätigen (verhindert Lade-Spinner auf Inline-Button).
 *  Optional Toast-Text (kurz, max 200 Zeichen). */
export async function answerCallbackQuery(token: string, callback_query_id: string, options?: {
  text?:       string;
  show_alert?: boolean;
}): Promise<boolean> {
  return callApi<boolean>(token, "answerCallbackQuery", { callback_query_id, ...options });
}

/** Telegram-Client-Menü (das „/" Menü) füllen. Aufgerufen direkt nach
 *  setWebhook in der Admin-Bot-Verbindung. Telegram cached das ~24h. */
export interface BotCommand { command: string; description: string }
export async function setMyCommands(token: string, commands: BotCommand[]): Promise<boolean> {
  return callApi<boolean>(token, "setMyCommands", { commands });
}

/** Chat-Menü-Button (links unten im Chat-Eingabefeld) auf eine WebApp setzen.
 *  Default ist „commands" (zeigt das „/" Menü). Wir überschreiben mit einem
 *  Web-App-Launcher der die Mini-App im Telegram-WebView öffnet.
 *
 *  Spec: https://core.telegram.org/bots/api#setchatmenubutton
 *
 *  Wenn chat_id weggelassen wird, gilt der Button global für alle Privat-Chats
 *  des Bots — das wollen wir hier (ein Shop für alle). */
export async function setChatMenuButton(
  token:  string,
  text:   string,
  webAppUrl: string,
): Promise<boolean> {
  return callApi<boolean>(token, "setChatMenuButton", {
    menu_button: {
      type:    "web_app",
      text,
      web_app: { url: webAppUrl },
    },
  });
}

/** Zurück auf Default-Button (zeigt das „/" Menü) — für „Disconnect Mini App". */
export async function resetChatMenuButton(token: string): Promise<boolean> {
  return callApi<boolean>(token, "setChatMenuButton", {
    menu_button: { type: "default" },
  });
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
