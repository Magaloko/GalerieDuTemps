import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyInitData,
  loadBotTokenForAuth,
} from "@/lib/telegram/webapp-auth";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { customerById } from "@/lib/db/customers";
import { leadAusKanalErstellen } from "@/lib/db/leads";
import { notifyNewLead } from "@/lib/notifications/lead-notify";
import { query } from "@/lib/db";
import { rateLimitAsync, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic     = "force-dynamic";
export const maxDuration = 10;

const Schema = z.object({
  initData:   z.string().min(20),
  text:       z.string().min(2).max(2000),
  produkt_id: z.string().uuid().optional(),
  betreff:    z.string().max(200).optional(),
});

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/kontakt
 *
 * Mini-App-Nutzer schickt eine Nachricht an die Galerie. Erzeugt einen
 * Lead in sebo.leads (gleiche Inbox wie web-Kontaktformular + Telegram-Bot-
 * DMs) und löst notifyNewLead aus (Email + Telegram-Notification an Admin).
 *
 * Kontext-Anreicherung:
 *  - Wenn linked Customer-Session existiert → kontakt_email + name aus DB
 *  - Sonst → Telegram-User-Daten als Fallback (kontakt_email bleibt null,
 *    Admin kann nur per Telegram-Username antworten)
 *  - Wenn produkt_id mitgegeben → Lead wird produkt-spezifisch markiert
 *    (Admin sieht „Frage zu LOT 042" im Inbox-Filter)
 *
 * Rate-Limit: 5/30min/chat_id (spam-Schutz, unabhängig von IP da
 * Telegram-WebView mehrere User auf gleicher IP haben kann).
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // IP-Rate-Limit als zusätzliche Verteidigung
  const ip = getClientIp(req);
  const rl = await rateLimitAsync(`tg-kontakt:${ip}`, 5, 30 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // ── initData verifizieren ────────────────────────────────────────────────
  const botToken = await loadBotTokenForAuth();
  if (!botToken) {
    return NextResponse.json({ error: "Бот не настроен" }, { status: 503 });
  }
  const valid = verifyInitData(parsed.data.initData, botToken);
  if (!valid) {
    return NextResponse.json(
      { error: "Подпись недействительна. Перезайдите в Mini-App." },
      { status: 401 },
    );
  }

  // ── Per-chat_id Rate-Limit ───────────────────────────────────────────────
  const rlChat = await rateLimitAsync(`tg-kontakt:chat:${valid.user.id}`, 5, 30 * 60 * 1000);
  if (!rlChat.erlaubt) return tooManyRequestsResponse(rlChat);

  // ── Kontakt-Daten anreichern (linked customer vs nur Telegram) ───────────
  const session  = await getWebAppSession();
  const customer = session?.customerId
    ? await customerById(session.customerId).catch(() => null)
    : null;

  const kontaktHandle = valid.user.username
    ? `@${valid.user.username}`
    : `tg:${valid.user.id}`;
  const kontaktName = customer
    ? [customer.vorname, customer.nachname].filter(Boolean).join(" ") || customer.email
    : [valid.user.first_name, valid.user.last_name].filter(Boolean).join(" ") || kontaktHandle;
  const kontaktEmail = customer?.email ?? null;

  // ── Optional: Telegram-Bot-Kanal-Konto holen für lead.kanal_konto_id ────
  const kanal = await query<{ id: number }>(
    `SELECT id FROM sebo.kanal_konten
     WHERE kanal = 'telegram' AND aktiv = true ORDER BY id DESC LIMIT 1`,
  );
  const kanalKontoId = kanal.rows[0]?.id ?? null;

  // ── Produkt-Info als Betreff-Anreicherung ────────────────────────────────
  let betreff = parsed.data.betreff ?? "Сообщение из Mini-App";
  if (parsed.data.produkt_id) {
    const p = await query<{ name: string }>(
      `SELECT name FROM sebo.produkte WHERE id = $1 LIMIT 1`,
      [parsed.data.produkt_id],
    );
    if (p.rows[0]) betreff = `Вопрос о товаре · ${p.rows[0].name}`;
  }

  // ── Lead erstellen (idempotent via externe_id) ───────────────────────────
  // externe_id: tg-miniapp:<chat_id>:<timestamp> — eindeutig pro Sendung
  const externeId = `tg-miniapp:${valid.user.id}:${Date.now()}`;

  try {
    const { id: leadId, created } = await leadAusKanalErstellen({
      quelle:         "telegram",
      kanal_konto_id: kanalKontoId ?? undefined,
      externe_id:     externeId,
      kontakt_handle: kontaktHandle,
      kontakt_name:   kontaktName,
      kontakt_email:  kontaktEmail ?? undefined,
      betreff,
      vorschau:       parsed.data.text.slice(0, 240),
      text:           parsed.data.text,
      produkt_id:     parsed.data.produkt_id ?? undefined,
      raw_payload: {
        source:        "telegram-miniapp",
        telegram_user: valid.user,
        customer_id:   customer?.id ?? null,
      },
    });

    if (created) {
      notifyNewLead({
        id:             leadId,
        quelle:         "telegram",
        kontakt_name:   kontaktName,
        kontakt_email:  kontaktEmail,
        kontakt_handle: kontaktHandle,
        betreff,
        vorschau:       parsed.data.text.slice(0, 240),
        produkt_id:     parsed.data.produkt_id ?? null,
      }).catch(err => console.error("[notifyNewLead]", err));
    }

    return NextResponse.json({ ok: true, lead_id: leadId });
  } catch (err) {
    console.error("[/api/telegram/kontakt]", err);
    return NextResponse.json(
      { error: "Не удалось отправить. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
