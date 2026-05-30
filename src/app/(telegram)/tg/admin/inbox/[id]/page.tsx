import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../../auth-gate";
import { leadById, leadMessages, leadTelegramChatId, leadOriginalNachricht } from "@/lib/db/leads";
import { query } from "@/lib/db";
import { formatPreis } from "@/lib/utils/preis";
import { LeadReplyClient } from "./reply-client";
import { ChevronLeft, Inbox, Package } from "lucide-react";
import type { Metadata } from "next";

/** Kompakte Produkt-Info für den Lead-Kontext (Bild + Status + Link). */
interface LeadProdukt {
  slug:          string;
  name:          string;
  preis:         number;
  waehrung:      string | null;
  hauptbild_url: string | null;
  verkauft:      boolean;
  reserviert:    boolean;
}
async function leadProduktInfo(produktId: string): Promise<LeadProdukt | null> {
  const r = await query<LeadProdukt>(
    `SELECT p.slug, p.name, p.preis, p.waehrung, p.verkauft,
            (p.reserviert_bis IS NOT NULL AND p.reserviert_bis > now() AND p.verkauft = false) AS reserviert,
            COALESCE(p.hauptbild_url,
              (SELECT COALESCE(pb.url_medium, pb.url) FROM sebo.produktbilder pb
                WHERE pb.produkt_id = p.id ORDER BY pb.ist_hauptbild DESC, pb.sortierung LIMIT 1)
            ) AS hauptbild_url
       FROM sebo.produkte p WHERE p.id = $1`,
    [produktId],
  );
  return r.rows[0] ?? null;
}

export const metadata: Metadata = {
  title:  "Лид · Mini-App",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/inbox/[id] — Lead-Detail mit Inline-Reply.
 *
 * Server lädt Lead + Messages + ermittelt Reply-Kanal. Reply-Form (Client)
 * sendet via /api/telegram/admin/reply → Bot-DM oder E-Mail an den Kontakt.
 *
 * Das ist der „close the loop"-Moment: Admin sieht Lead, tippt Antwort,
 * Kunde kriegt sie direkt in Telegram — ohne Desktop.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminLeadDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getWebAppSession();

  if (!session || session.role !== "admin") {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[60dvh] flex flex-col items-center justify-center gap-3">
          <Inbox className="w-10 h-10" style={{ color: "var(--color-ink-mute)" }} />
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>
            Только для администраторов
          </p>
          <Link href="/tg" className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}>
            ← В каталог
          </Link>
        </main>
      </TelegramAuthGate>
    );
  }

  const [lead, messages] = await Promise.all([
    leadById(id),
    leadMessages(id),
  ]);

  if (!lead) {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[50dvh] flex flex-col items-center justify-center gap-3">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>
            Лид не найден
          </p>
          <Link href="/tg/admin/inbox" className="text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}>
            ← К списку
          </Link>
        </main>
      </TelegramAuthGate>
    );
  }

  // Reply-Kanal bestimmen + Original-Text + ggf. Produkt-Kontext laden
  const [chatId, originalText, produkt] = await Promise.all([
    leadTelegramChatId(id),
    lead.quelle === "kontaktanfrage" ? leadOriginalNachricht(id).catch(() => null) : Promise.resolve(null),
    lead.produkt_id ? leadProduktInfo(lead.produkt_id).catch(() => null) : Promise.resolve(null),
  ]);
  const replyChannel: "telegram" | "email" | null =
    chatId ? "telegram"
    : (lead.kontakt_email || lead.customer_email) ? "email"
    : null;

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-24">
        {/* Back */}
        <Link
          href="/tg/admin/inbox"
          className="inline-flex items-center gap-1 mb-4 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", color: "var(--tg-theme-link-color, var(--color-coral))" }}
        >
          <ChevronLeft className="w-3 h-3" /> Inbox
        </Link>

        {/* Lead-Header */}
        <header className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[9px] uppercase font-medium px-1.5 py-0.5"
              style={{ letterSpacing: "0.18em", background: "var(--color-bone)", color: "var(--color-ink-mute)" }}
            >
              {lead.quelle}
            </span>
            {lead.prioritaet && lead.prioritaet !== "normal" && (
              <span
                className="text-[9px] uppercase font-medium px-1.5 py-0.5"
                style={{
                  letterSpacing: "0.18em",
                  background: lead.prioritaet === "dringend" ? "rgba(232,112,58,0.12)" : "rgba(201,168,76,0.12)",
                  color:      lead.prioritaet === "dringend" ? "var(--color-coral)"     : "#8B6F47",
                }}
              >
                {lead.prioritaet}
              </span>
            )}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   22,
              color:      "var(--tg-theme-text-color, var(--color-ink))",
              lineHeight: 1.15,
            }}
          >
            {lead.kontakt_name ?? lead.kontakt_handle ?? lead.kontakt_email ?? "—"}
          </h1>
          {lead.betreff && (
            <p className="mt-1 text-sm" style={{ color: "var(--tg-theme-text-color, var(--color-ink-soft))" }}>
              {lead.betreff}
            </p>
          )}
          {/* Kontakt-Meta */}
          <div className="flex flex-wrap gap-2 mt-2">
            {lead.kontakt_handle && (
              <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-mute)" }}>
                {lead.kontakt_handle}
              </span>
            )}
            {(lead.kontakt_email || lead.customer_email) && (
              <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-mute)" }}>
                {lead.kontakt_email ?? lead.customer_email}
              </span>
            )}
          </div>

          {/* Kontaktdaten des Kunden (aus Profil) — anklickbar für Rückkontakt */}
          <KontaktBlock
            telefon={lead.customer_telefon}
            whatsapp={lead.customer_whatsapp}
            telegram={lead.customer_telegram_username}
            kanal={lead.customer_kontakt_kanal}
          />
        </header>

        {/* Produkt-Kontext (wenn Lead zu einem Stück gehört) */}
        {produkt && (
          <Link
            href={`/tg/produkt/${produkt.slug}`}
            className="flex items-center gap-3 p-2.5 mb-4"
            style={{
              background:  "var(--tg-theme-section-bg-color, #fff)",
              border:      "1px solid var(--color-line)",
              borderLeft:  "3px solid var(--color-coral)",
              touchAction: "manipulation",
            }}
          >
            <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ background: "var(--color-bone)" }}>
              {produkt.hauptbild_url && /* eslint-disable-next-line @next/next/no-img-element */
                <img src={produkt.hauptbild_url} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1 text-[9px] uppercase font-medium"
                 style={{ letterSpacing: "0.2em", color: "var(--color-coral)" }}>
                <Package className="w-3 h-3" /> О товаре
              </p>
              <p className="text-sm truncate" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                {produkt.name}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                {formatPreis(Number(produkt.preis), (produkt.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT")}
                {produkt.verkauft ? " · продан" : produkt.reserviert ? " · бронь" : ""}
              </p>
            </div>
          </Link>
        )}

        {/* Original + Conversation */}
        <div className="space-y-2 mb-5">
          {originalText && (
            <MessageBubble richtung="inbound" text={originalText} />
          )}
          {messages.map(m => (
            <MessageBubble key={m.id} richtung={m.richtung} text={m.text ?? ""} autor={m.autor_name} />
          ))}
          {messages.length === 0 && !originalText && lead.vorschau && (
            <MessageBubble richtung="inbound" text={lead.vorschau} />
          )}
        </div>

        {/* Reply-Form ODER Hinweis */}
        {replyChannel ? (
          <LeadReplyClient
            leadId={lead.id}
            channel={replyChannel}
            kontaktName={lead.kontakt_name ?? lead.kontakt_handle ?? "клиент"}
          />
        ) : (
          <div
            className="p-3 text-xs"
            style={{
              background: "var(--color-bone)",
              border:     "1px solid var(--color-line)",
              color:      "var(--color-ink-soft)",
            }}
          >
            Нет канала для ответа. Откройте лид на сайте:{" "}
            <a href={`/admin/leads/${lead.id}`} target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--color-coral)", textDecoration: "underline" }}>
              /admin/leads
            </a>
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}

const KANAL_LABEL: Record<string, string> = {
  telegram: "Telegram", telefon: "Телефон", whatsapp: "WhatsApp", email: "E-mail",
};

/** Kontaktdaten-Block: anklickbare Telefon/WhatsApp/Telegram-Links + bevorzugter Kanal. */
function KontaktBlock({
  telefon, whatsapp, telegram, kanal,
}: {
  telefon: string | null | undefined;
  whatsapp: string | null | undefined;
  telegram: string | null | undefined;
  kanal: string | null | undefined;
}) {
  if (!telefon && !whatsapp && !telegram) return null;
  const waDigits = whatsapp ? whatsapp.replace(/\D/g, "") : "";
  const tgHandle = telegram ? telegram.replace(/^@+/, "") : "";

  const pill = (label: string, href: string, bevorzugt: boolean) => (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 text-[11px]"
      style={{
        background: bevorzugt ? "rgba(232,112,58,0.10)" : "var(--color-bone)",
        border:     `1px solid ${bevorzugt ? "rgba(232,112,58,0.40)" : "var(--color-line)"}`,
        color:      bevorzugt ? "var(--color-coral)" : "var(--tg-theme-text-color, var(--color-ink))",
        touchAction: "manipulation",
      }}
    >
      {label}
    </a>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {telefon  && pill(`☎ ${telefon}`,  `tel:${telefon.replace(/\s/g, "")}`, kanal === "telefon")}
      {waDigits && pill(`WhatsApp`,       `https://wa.me/${waDigits}`,          kanal === "whatsapp")}
      {tgHandle && pill(`@${tgHandle}`,   `https://t.me/${tgHandle}`,           kanal === "telegram")}
      {kanal && KANAL_LABEL[kanal] && (
        <span className="text-[10px] uppercase" style={{ letterSpacing: "0.14em", color: "var(--color-ink-mute)" }}>
          предпочитает: {KANAL_LABEL[kanal]}
        </span>
      )}
    </div>
  );
}

function MessageBubble({
  richtung, text, autor,
}: {
  richtung: "inbound" | "outbound" | "interne_notiz";
  text:     string;
  autor?:   string | null;
}) {
  const isOut  = richtung === "outbound";
  const isNote = richtung === "interne_notiz";
  return (
    <div
      className="p-3 text-sm"
      style={{
        background: isNote ? "rgba(201,168,76,0.08)"
                  : isOut  ? "rgba(232,112,58,0.08)"
                  :          "var(--tg-theme-section-bg-color, #fff)",
        border:     `1px solid ${isOut ? "rgba(232,112,58,0.30)" : "var(--color-line)"}`,
        borderLeft: isOut ? "3px solid var(--color-coral)" : undefined,
        marginLeft: isOut ? 24 : 0,
        marginRight: isOut ? 0 : 24,
        color:      "var(--tg-theme-text-color, var(--color-ink))",
        whiteSpace: "pre-wrap",
      }}
    >
      {isNote && (
        <p className="text-[9px] uppercase font-medium mb-1" style={{ letterSpacing: "0.18em", color: "#8B6F47" }}>
          Заметка
        </p>
      )}
      {isOut && autor && (
        <p className="text-[9px] uppercase font-medium mb-1" style={{ letterSpacing: "0.18em", color: "var(--color-coral)" }}>
          {autor}
        </p>
      )}
      {text}
    </div>
  );
}
