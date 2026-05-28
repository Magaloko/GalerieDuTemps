import { getFile, downloadTelegramFile, sendMessage, type InlineKeyboardMarkup } from "@/lib/telegram/client";
import { bildVerarbeiten } from "@/lib/storage/upload";
import { produktErstellen } from "@/lib/db/produkte";
import { bildEinfuegen } from "@/lib/db/bilder";
import { getSiteUrl } from "@/lib/site-url";
import { formatPreis } from "@/lib/utils/preis";
import { parsePreis } from "./caption-preis";

/* ──────────────────────────────────────────────────────────────────────────
 * Produkt-Erstellung via Telegram-Foto (Sprint B · Phase 4.1)
 *
 * Admin schickt ein Foto (optional mit Caption) an den Bot. Wir:
 *  1. Größtes Foto via getFile + download → Buffer
 *  2. Durch sharp-Pipeline (bildVerarbeiten) → komprimiert + WebP-Varianten
 *  3. Draft-Produkt anlegen (aktiv=false, b2c_mode=hidden, Placeholder-Preis)
 *  4. Bild als Hauptbild verknüpfen
 *  5. Antwort mit Zusammenfassung + Inline-Buttons (Bearbeiten / Löschen)
 *
 * Caption-Parsing (ohne AI, schnell + robust im Webhook-Hot-Path):
 *  - Erste Zeile → Produktname
 *  - Voller Text → Beschreibung
 *  - Preis bleibt Placeholder (1) — Admin setzt ihn auf der Web-Edit-Seite
 *
 * Hot-Path-Constraint: Telegram retry'd den Webhook nach 60s → wir müssen
 * schnell antworten. Daher KEIN AI-Call hier (das wäre Phase 4.3 mit
 * Conversation-State + Background-Job).
 * ────────────────────────────────────────────────────────────────────────── */

interface TgPhotoSize {
  file_id: string;
  width:   number;
  height:  number;
  file_size?: number;
}

const PLACEHOLDER_PREIS = 1;          // positive (DB-CHECK), Admin überschreibt
const MAX_TG_PHOTO_BYTES = 10 * 1024 * 1024;

export interface ProduktAusFotoResult {
  ok:        true;
  produktId: string;
  name:      string;
  editUrl:   string;
  /** true = direkt veröffentlicht (Preis in Caption erkannt). false = Entwurf. */
  live:      boolean;
  /** Erkannter Preis (KZT) oder null wenn keiner in der Caption stand. */
  preis:     number | null;
}
export interface ProduktAusFotoError {
  ok:    false;
  error: string;
}

/**
 * Hauptfunktion: erstellt aus einem Telegram-Foto ein Draft-Produkt.
 * benutzerId = der Admin der das Foto schickt (für Audit/Autor).
 */
export async function produktAusFotoErstellen(opts: {
  botToken:   string;
  photos:     TgPhotoSize[];
  caption:    string | null;
  benutzerId: string;
}): Promise<ProduktAusFotoResult | ProduktAusFotoError> {
  const { botToken, photos, caption, benutzerId } = opts;

  if (!photos || photos.length === 0) {
    return { ok: false, error: "Нет фото в сообщении." };
  }

  // Größtes Foto wählen (Telegram liefert mehrere Auflösungen aufsteigend)
  const largest = [...photos].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  if (largest.file_size && largest.file_size > MAX_TG_PHOTO_BYTES) {
    return { ok: false, error: "Фото слишком большое (макс. 10 МБ)." };
  }

  // 1. Download
  let buffer: Buffer;
  try {
    const fileInfo = await getFile(botToken, largest.file_id);
    if (!fileInfo.file_path) return { ok: false, error: "Не удалось получить файл из Telegram." };
    buffer = await downloadTelegramFile(botToken, fileInfo.file_path);
  } catch (err) {
    console.error("[produktAusFoto] download", err);
    return { ok: false, error: "Ошибка загрузки фото из Telegram." };
  }

  // 2. Durch Bild-Pipeline (File-Wrapper um Buffer — Node 20 hat globales File)
  let bild;
  try {
    // Uint8Array statt Buffer — Buffer ist (TS-seitig) kein valides BlobPart
    // wegen SharedArrayBuffer-Union; new Uint8Array kopiert in ArrayBuffer.
    const file = new File([new Uint8Array(buffer)], `tg-${Date.now()}.jpg`, { type: "image/jpeg" });
    bild = await bildVerarbeiten(file);
  } catch (err) {
    console.error("[produktAusFoto] bildVerarbeiten", err);
    return { ok: false, error: "Не удалось обработать изображение." };
  }

  // 3. Caption parsen — Name (Zeile 1) · Preis (Zahl-Zeile / „Цена: …") · Beschreibung (Rest)
  const cap   = (caption ?? "").trim();
  const lines = cap.split("\n").map(l => l.trim()).filter(Boolean);
  const name  = lines[0]?.slice(0, 200)
    || `Черновик · ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;

  // Preis suchen: erste Zeile ab #2 die als Preis lesbar ist (bevorzugt Zeile 2).
  let preis: number | null = null;
  let preisIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    const p = parsePreis(lines[i]);
    if (p != null) { preis = p; preisIdx = i; break; }
  }

  // Beschreibung = restliche Zeilen (ohne Name- und Preis-Zeile).
  const beschreibungLines = lines.filter((_, i) => i !== 0 && i !== preisIdx);
  const beschreibung = beschreibungLines.length ? beschreibungLines.join("\n") : null;

  // Live wenn ein gültiger Preis erkannt wurde — sonst Entwurf (versteckt).
  const live = preis != null;

  // 4. Produkt anlegen (live ODER Entwurf)
  let produktId: string;
  try {
    // produktErstellen erwartet ProduktCreateInput. Mit Preis ⇒ aktiv + sichtbar
    // (sofort im Katalog). Ohne Preis ⇒ Entwurf: aktiv=false + b2c_mode=hidden,
    // nirgends sichtbar bis der Admin den Preis nachträgt.
    const produkt = await produktErstellen({
      name,
      preis:        preis ?? PLACEHOLDER_PREIS,
      beschreibung: beschreibung ?? undefined,
      zustand:      "gut",
      lagerbestand: 1,
      aktiv:        live,
      b2c_mode:     live ? "visible" : "hidden",
      waehrung:     "KZT",
      featured:     false,
      verkauft:     false,
      tags:         [],
      hauptbild_url: bild.url,
      // restliche optionale Felder default/null
    } as Parameters<typeof produktErstellen>[0], benutzerId);
    produktId = produkt.id;
  } catch (err) {
    console.error("[produktAusFoto] produktErstellen", err);
    return { ok: false, error: "Не удалось создать товар." };
  }

  // 5. Bild als Galerie-Hauptbild verknüpfen
  try {
    await bildEinfuegen({
      produkt_id:    produktId,
      url:           bild.url,
      url_thumb:     bild.url_thumb,
      url_medium:    bild.url_medium,
      url_large:     bild.url_large,
      format:        bild.format,
      alt_text:      name,
      ist_hauptbild: true,
      dateigroesse:  bild.dateigroesse,
      breite:        bild.breite,
      hoehe:         bild.hoehe,
      sha256:        bild.sha256,
    });
  } catch (err) {
    // Nicht fatal — Produkt existiert, hauptbild_url ist schon gesetzt.
    console.warn("[produktAusFoto] bildEinfuegen", err);
  }

  const editUrl = `${getSiteUrl()}/admin/produkte/${produktId}/bearbeiten`;
  return { ok: true, produktId, name, editUrl, live, preis };
}

/** Baut die Antwort-Nachricht + Inline-Keyboard nach erfolgreicher Erstellung. */
export function buildErfolgsAntwort(r: ProduktAusFotoResult): {
  text: string; keyboard: InlineKeyboardMarkup;
} {
  const siteBase   = getSiteUrl();
  const queueUrl   = `${siteBase}/admin/produkte/entwuerfe`;
  const miniAppEdit = `${siteBase}/tg/admin/produkte/${r.produktId}`;

  if (r.live && r.preis != null) {
    // Direkt veröffentlicht (Preis erkannt) → sichtbar im Katalog.
    const text =
      `✓ <b>Опубликовано</b>\n\n` +
      `📦 ${escapeHtml(r.name)}\n` +
      `💰 ${escapeHtml(formatPreis(r.preis, "KZT"))} · <i>виден покупателям</i>\n\n` +
      `Можно отредактировать (фото, описание, категория) или удалить.`;
    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: "✏️ Редактировать", web_app: { url: miniAppEdit } }],
        [{ text: "🌐 Открыть на сайте", url: r.editUrl }],
        [{ text: "🗑 Удалить", callback_data: `delprod:${r.produktId}` }],
      ],
    };
    return { text, keyboard };
  }

  // Kein Preis → Entwurf (versteckt). Hinweis, wie man direkt veröffentlicht.
  const text =
    `✓ <b>Черновик создан</b>\n\n` +
    `📦 ${escapeHtml(r.name)}\n` +
    `<i>Цена не указана · скрыт от покупателей</i>\n\n` +
    `💡 Чтобы опубликовать сразу — укажите <b>цену во второй строке</b> подписи к фото ` +
    `(напр.: <code>45000</code>). Третья строка и далее — описание.`;
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: "✏️ Заполнить и опубликовать", web_app: { url: miniAppEdit } }],
      [{ text: "📥 Черновики (ИИ · пачкой)", url: queueUrl }],
      [{ text: "🗑 Удалить черновик", callback_data: `delprod:${r.produktId}` }],
    ],
  };
  return { text, keyboard };
}

/** Convenience: kompletter Flow inkl. Antwort senden. */
export async function handleAdminFoto(opts: {
  botToken:   string;
  chatId:     number;
  photos:     TgPhotoSize[];
  caption:    string | null;
  benutzerId: string;
}): Promise<void> {
  // Sofort-Feedback dass wir arbeiten (Bild-Pipeline kann 2-4s dauern)
  await sendMessage(opts.botToken, opts.chatId, "⏳ Обрабатываю фото…").catch(() => {});

  const result = await produktAusFotoErstellen(opts);

  if (!result.ok) {
    await sendMessage(opts.botToken, opts.chatId, `✕ ${result.error}`).catch(() => {});
    return;
  }

  const { text, keyboard } = buildErfolgsAntwort(result);
  await sendMessage(opts.botToken, opts.chatId, text, {
    parse_mode:   "HTML",
    reply_markup: keyboard,
  }).catch(err => console.error("[handleAdminFoto] reply", err));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, c => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}
