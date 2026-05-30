import { KontaktFormular } from "./kontakt-formular";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { kontaktKanaeleLaden, whatsappUrl, telegramUrl } from "@/lib/db/kontakt-kanaele";
import { requireFeature } from "@/lib/db/feature-flags";

export const metadata: Metadata = {
  title:       "Контакты",
  description: "Вопросы или запросы? Мы рады услышать вас. Алматы, Казахстан.",
  alternates:  { canonical: "/kontakt" },
};

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 11 || !d.startsWith("7")) return d ? `+${d}` : "";
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Kontakt — Handoff G1.
 *
 * 2-col Grid (1.1fr 1fr), full-viewport-height:
 *  - Links (paper): eyebrow + display-lg 2-line H1 "Приходите в галерею." +
 *    italic Erklärung + 2×2 Contact-Card-Grid (Адрес, Часы, Звонок (coral),
 *    Почта).
 *  - Rechts (bone, border-left): eyebrow + display-xs H2 + Inline-Edit-Form +
 *    Coral-Submit + Map-Mock am Boden.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function KontaktPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; name?: string; intent?: string }>;
}) {
  await requireFeature("kontaktformular");
  const [{ t }, kontakt, sp] = await Promise.all([
    getDictionary(),
    kontaktKanaeleLaden(),
    searchParams,
  ]);

  // Vorbelegung bei Produkt-/Reservierungs-Anfrage (Deep-Link von Produktseite).
  const prodName = sp.name?.trim();
  const prefill =
    sp.intent === "reserve"
      ? {
          betreff:   prodName ? `Запрос на бронь: ${prodName}` : "Запрос на бронь",
          nachricht: `Здравствуйте! Хочу зарезервировать${prodName ? `: ${prodName}` : " этот предмет"}${sp.produkt ? ` (#${sp.produkt})` : ""}. Подскажите, пожалуйста, по наличию и условиям.`,
        }
      : sp.produkt
        ? {
            betreff:   prodName ? `Вопрос о товаре: ${prodName}` : "Вопрос о товаре",
            nachricht: `Здравствуйте! Интересует${prodName ? `: ${prodName}` : " этот предмет"}${sp.produkt ? ` (#${sp.produkt})` : ""}. `,
          }
        : undefined;

  const wa = whatsappUrl(kontakt.whatsapp_nummer);
  const tg = telegramUrl(kontakt.telegram_channel);
  const phoneText = formatPhoneDisplay(kontakt.whatsapp_nummer);

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-screen">

        {/* ─── Links (paper) ──────────────────────────────────────────── */}
        <div className="px-6 md:px-14 py-14 md:py-20">
          <p
            className="text-[11px] uppercase font-medium mb-6"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            {t.kontakt_seite.titel}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.75rem, 7vw, 5rem)",
              lineHeight: 0.98,
              color:      "var(--color-ink)",
            }}
          >
            Приходите<br />
            <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>
              в галерею.
            </em>
          </h1>
          <p
            className="mt-6 max-w-md"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              fontSize:   17,
              lineHeight: 1.6,
              color:      "var(--color-ink-soft)",
            }}
          >
            {t.kontakt_seite.untertitel}
          </p>

          {/* 2×2 Contact-Card-Grid */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <ContactCard
              eyebrow="Адрес"
              h1="Алматы"
              h2="Казахстан"
              sub="ул. Достык 89, БЦ Тенгиз"
              cta="Маршрут →"
              href="https://2gis.kz/almaty"
            />
            <ContactCard
              eyebrow={t.kontakt_seite.oeffnungszeiten.split(":")[0] ?? "Часы работы"}
              h1="Пн–Пт"
              h2="10–18"
              sub={t.kontakt_seite.oeffnungszeiten}
              cta="Подробнее →"
            />
            <ContactCard
              variant="coral"
              eyebrow="WhatsApp"
              h1={phoneText || "Звонок"}
              h2="на связи"
              sub="Пн–Сб · 10:00–20:00"
              cta="Написать →"
              href={wa ?? "#"}
            />
            <ContactCard
              eyebrow="Почта"
              h1="bonjour"
              h2="@galeriedutemps.kz"
              sub="Ответ в течение 24–48 ч"
              cta="Написать →"
              href="mailto:bonjour@galeriedutemps.kz"
            />
          </div>

          {/* Telegram Quick-Link */}
          {tg && (
            <div className="mt-8">
              <a
                href={tg}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] uppercase font-medium inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
              >
                ◆ {t.kontakt_kanal.telegram} →
              </a>
            </div>
          )}
        </div>

        {/* ─── Rechts (bone) ──────────────────────────────────────────── */}
        <div
          className="px-6 md:px-14 py-14 md:py-20 lg:border-l"
          style={{
            background:   "var(--color-bone)",
            borderColor:  "var(--color-line)",
          }}
        >
          <p
            className="text-[11px] uppercase font-medium mb-4"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            Форма обратной связи
          </p>
          <h2
            className="mb-10"
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(1.5rem, 3vw, 1.75rem)",
              color:      "var(--color-ink)",
            }}
          >
            Напишите нам.
          </h2>

          <KontaktFormular
            labels={{
              name:                  t.allg.name,
              name_placeholder:      t.allg.name,
              email:                 t.allg.email,
              email_placeholder:     "anna@example.kz",
              betreff:               t.kontakt_seite.betreff,
              betreff_placeholder:   t.kontakt_seite.betreff_placeholder,
              nachricht:             t.allg.nachricht,
              nachricht_placeholder: t.kontakt_seite.nachricht_placeholder,
              senden:                t.allg.nachricht_send,
              gesendet:              t.kontakt_seite.nachricht_gesendet,
              danke:                 t.kontakt_seite.danke_text,
            }}
            prefill={prefill}
          />

          {/* Map-Mock */}
          <div className="mt-10">
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: "16 / 7",
                background:  "var(--color-paper-cool)",
                border:      "1px solid var(--color-line)",
              }}
            >
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 175" aria-hidden="true">
                {/* Drawn streets */}
                <line x1="0"   y1="60"  x2="400" y2="65"  stroke="var(--color-line)" strokeWidth="1.5" />
                <line x1="0"   y1="120" x2="400" y2="115" stroke="var(--color-line)" strokeWidth="1.5" />
                <line x1="120" y1="0"   x2="125" y2="175" stroke="var(--color-line)" strokeWidth="1.5" />
                <line x1="260" y1="0"   x2="255" y2="175" stroke="var(--color-line)" strokeWidth="1.5" />
                {/* Coral pin with halo */}
                <circle cx="200" cy="90" r="14" fill="rgba(232,112,58,0.18)" />
                <circle cx="200" cy="90" r="6"  fill="var(--color-coral)" />
              </svg>
              <div
                className="absolute top-3 left-3 px-3 py-1.5 text-[10px] uppercase font-medium"
                style={{
                  background:    "var(--color-paper)",
                  letterSpacing: "0.22em",
                  color:         "var(--color-ink-soft)",
                  border:        "1px solid var(--color-line)",
                }}
              >
                Алматы · Достык 89
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ContactCard ───────────────────────────────────────────────────────── */

function ContactCard({
  variant = "default",
  eyebrow, h1, h2, sub, cta, href,
}: {
  variant?: "default" | "coral";
  eyebrow:  string;
  h1:       string;
  h2:       string;
  sub:      string;
  cta:      string;
  href?:    string;
}) {
  const isCoral = variant === "coral";
  const Wrap   = href ? "a" : "div";
  return (
    <Wrap
      {...(href ? { href, target: href.startsWith("http") ? "_blank" : undefined, rel: "noopener noreferrer" } : {})}
      className="block px-5 py-5 transition-opacity hover:opacity-90"
      style={{
        background: isCoral ? "var(--color-coral)" : "#fff",
        border:     isCoral ? "1px solid var(--color-coral)" : "1px solid var(--color-line)",
        color:      isCoral ? "var(--color-cobalt)" : "var(--color-ink)",
      }}
    >
      <p
        className="text-[10px] uppercase font-medium mb-2"
        style={{
          letterSpacing: "0.28em",
          color: isCoral ? "rgba(15,20,48,0.7)" : "var(--color-coral)",
        }}
      >
        {eyebrow}
      </p>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   isCoral ? 28 : 26,
          lineHeight: 1.05,
          color:      isCoral ? "var(--color-cobalt)" : "var(--color-ink)",
        }}
      >
        {h1}
      </p>
      <p
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          fontSize:   20,
          lineHeight: 1.05,
          color:      isCoral ? "var(--color-cobalt)" : "var(--color-coral)",
          marginTop:  2,
        }}
      >
        {h2}
      </p>
      <p
        className="mt-3 text-[12px]"
        style={{
          color: isCoral ? "rgba(15,20,48,0.65)" : "var(--color-ink-mute)",
        }}
      >
        {sub}
      </p>
      <p
        className="mt-4 pt-3 text-[10px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          color:         isCoral ? "var(--color-cobalt)" : "var(--color-coral)",
          borderTop:     `1px solid ${isCoral ? "rgba(15,20,48,0.2)" : "var(--color-line)"}`,
        }}
      >
        {cta}
      </p>
    </Wrap>
  );
}
