import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { sendInvoice } from "@/lib/telegram/client";
import { loadBotTokenForAuth } from "@/lib/telegram/webapp-auth";

export const dynamic     = "force-dynamic";
export const maxDuration = 15;

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/telegram/checkout
 *
 * Body: { items: [{produkt_id, name, menge, einzelpreis_cents}, ...] }
 *
 * Flow:
 *   1. Session-Cookie prüfen → Customer-Lookup
 *   2. Items gegen DB validieren (Preis-Manipulation verhindern!)
 *   3. sendInvoice an chat_id mit aktuellen Preisen + Provider-Token
 *   4. Telegram zeigt natives Payment-Sheet im WebView
 *
 * Webhook-Folge (separater Endpoint, später):
 *   - pre_checkout_query → answerPreCheckoutQuery(ok=true)
 *   - successful_payment → Bestellung anlegen, Cart leeren, Notification
 *
 * Provider-Token ist sensibel — kommt aus ENV. Wenn nicht gesetzt → 503
 * mit klarer Anleitung wie er beim BotFather aktiviert wird.
 * ────────────────────────────────────────────────────────────────────────── */

const PROVIDER_TOKEN_ENV = "TELEGRAM_PAYMENTS_PROVIDER_TOKEN";

interface InboundItem {
  produkt_id:        string;
  name:              string;
  menge:             number;
  einzelpreis_cents: number;
}

interface ValidatedItem {
  produkt_id:    string;
  name:          string;
  menge:         number;
  preisCents:    number;     // SERVER-Preis, nicht client-input
}

export async function POST(req: NextRequest) {
  const session = await getWebAppSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const providerToken = process.env[PROVIDER_TOKEN_ENV];
  if (!providerToken) {
    return NextResponse.json({
      error: "Telegram-Payments nicht konfiguriert. Bitte beim BotFather " +
             "/mybots → Payments einen Provider aktivieren und den Token " +
             `als ENV-Variable ${PROVIDER_TOKEN_ENV} setzen.`,
    }, { status: 503 });
  }

  const botToken = await loadBotTokenForAuth();
  if (!botToken) {
    return NextResponse.json({ error: "Bot nicht konfiguriert." }, { status: 503 });
  }

  let body: { items?: InboundItem[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const inbound = Array.isArray(body.items) ? body.items : [];
  if (inbound.length === 0) {
    return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
  }

  // ── Server-side Preis-Validation ────────────────────────────────────────
  // Niemals dem Client-Preis vertrauen — wir laden frische Preise aus der DB
  // und ignorieren einzelpreis_cents aus dem Request.
  const ids = inbound.map(i => i.produkt_id);
  const dbProdukte = await query<{ id: string; name: string; preis: string; lagerbestand: number; verkauft: boolean; waehrung: string }>(
    `SELECT id, name, preis, lagerbestand, verkauft, waehrung
     FROM sebo.produkte
     WHERE id = ANY($1::uuid[])`,
    [ids],
  );

  const validated: ValidatedItem[] = [];
  for (const item of inbound) {
    const dbItem = dbProdukte.rows.find(p => p.id === item.produkt_id);
    if (!dbItem) {
      return NextResponse.json({ error: `Produkt nicht gefunden: ${item.produkt_id}` }, { status: 400 });
    }
    if (dbItem.verkauft || dbItem.lagerbestand < item.menge) {
      return NextResponse.json({ error: `Не в наличии: ${dbItem.name}` }, { status: 409 });
    }
    const preisCents = Math.round(parseFloat(dbItem.preis) * 100);
    validated.push({
      produkt_id: dbItem.id,
      name:       dbItem.name,
      menge:      Math.max(1, Math.floor(item.menge)),
      preisCents,
    });
  }

  const totalCents = validated.reduce((acc, it) => acc + it.preisCents * it.menge, 0);

  // Currency: nimm Währung des ersten Produkts (alle sollten gleich sein,
  // mixed-currency-Carts sind in Telegram-Payments nicht supported).
  const currency = dbProdukte.rows[0]?.waehrung ?? "KZT";

  // Customer-Chat-ID für sendInvoice holen
  const custRes = await query<{ telegram_chat_id: string | null }>(
    `SELECT telegram_chat_id FROM sebo.customers WHERE id = $1`,
    [session.customerId],
  );
  const chatId = custRes.rows[0]?.telegram_chat_id ? Number(custRes.rows[0].telegram_chat_id) : null;
  if (!chatId) {
    return NextResponse.json({ error: "Customer ohne Telegram-Verknüpfung" }, { status: 400 });
  }

  // Payload: wird bei successful_payment zurückgeschickt → wir können daraus
  // die Bestellung rekonstruieren. Max 128 bytes — packen wir minimal.
  const payload = JSON.stringify({
    cid:   session.customerId,
    items: validated.map(v => [v.produkt_id, v.menge]),  // tuple-array spart bytes
    ts:    Math.floor(Date.now() / 1000),
  }).slice(0, 128);

  try {
    await sendInvoice(botToken, {
      chat_id:        chatId,
      title:          `Galerie du Temps · ${validated.length} ${validated.length === 1 ? "позиция" : "позиций"}`,
      description:    validated.map(v => `${v.menge}× ${v.name}`).join(" · ").slice(0, 250),
      payload,
      provider_token: providerToken,
      currency,
      prices:         validated.map(v => ({
        label:  `${v.menge}× ${v.name.slice(0, 40)}`,
        amount: v.preisCents * v.menge,
      })),
      need_name:               true,
      need_email:              false,
      need_shipping_address:   true,
      is_flexible:             true,
    });
    return NextResponse.json({ ok: true, total_cents: totalCents });
  } catch (err) {
    console.error("[/api/telegram/checkout sendInvoice]", err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : "sendInvoice fehlgeschlagen",
    }, { status: 500 });
  }
}
