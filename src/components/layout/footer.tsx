import Link from "next/link";
import { Hourglass } from "@/components/brand/hourglass";
import type { Dictionary } from "@/i18n";
import {
  type KontaktKanaele,
  whatsappUrl,
  telegramUrl,
  instagramUrl,
} from "@/lib/db/kontakt-kanaele";

/* ──────────────────────────────────────────────────────────────────────────
 * Footer — Handoff E1.
 *
 * Drei Bänder:
 * 1. Newsletter (coral bg, cobalt text): Headline + Inline-Form.
 * 2. 4-col (cobalt bg): Brand | Магазин | Информация | Связь.
 * 3. Bottom (cobalt, hairline-cobalt top): © + Legal + Payment.
 *
 * Mobile: Newsletter stackt vertikal, Cols kollabieren zu 2-col + 2 full-rows.
 * ────────────────────────────────────────────────────────────────────────── */
export function Footer({
  t,
  kontakt,
  jahr,
}: {
  t:       Dictionary;
  kontakt: KontaktKanaele;
  jahr:    number;
}) {
  const wa = whatsappUrl(kontakt.whatsapp_nummer);
  const tg = telegramUrl(kontakt.telegram_channel);
  const ig = instagramUrl(kontakt.instagram_handle);

  return (
    <footer className="mt-auto">

      {/* ─── Band 1: Newsletter (coral) ─────────────────────────────── */}
      <section
        className="px-6 md:px-14 py-10 md:py-12"
        style={{ background: "var(--color-coral)", color: "var(--color-cobalt)" }}
      >
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div>
            <p className="text-[11px] uppercase font-medium mb-3" style={{ letterSpacing: "0.28em" }}>
              Newsletter
            </p>
            {/* TODO i18n: "Подписка на журнал" → footer.newsletter_titel split */}
            <h2
              className="leading-[1.02]"
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "clamp(2rem, 4vw, 2.5rem)",
                color:      "var(--color-cobalt)",
              }}
            >
              Подписка на <em className="font-italic">журнал</em>
            </h2>
            <p
              className="mt-3 text-[12px] uppercase font-medium"
              style={{ letterSpacing: "0.18em", color: "rgba(15,20,48,0.7)" }}
            >
              {t.newsletter.untertitel}
            </p>
          </div>

          <form
            action="/newsletter/anmelden"
            method="get"
            className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="ваш@email.com"
              className="flex-1 px-4 py-3 text-sm focus:outline-none"
              style={{
                background:  "var(--color-cobalt)",
                color:       "var(--color-vintage-white)",
                border:      "1px solid var(--color-cobalt-deep)",
                fontFamily:  "var(--font-italic)",
                fontStyle:   "italic",
              }}
            />
            <button
              type="submit"
              className="px-6 py-3 text-[12px] uppercase font-medium whitespace-nowrap"
              style={{
                background:    "var(--color-cobalt)",
                color:         "var(--color-coral)",
                borderTop:     "1px solid var(--color-cobalt-deep)",
                borderRight:   "1px solid var(--color-cobalt-deep)",
                borderBottom:  "1px solid var(--color-cobalt-deep)",
                borderLeft:    "1px solid var(--color-coral)",
                letterSpacing: "0.22em",
              }}
            >
              {/* TODO i18n: newsletter.absenden */}
              Подписаться →
            </button>
          </form>
        </div>
      </section>

      {/* ─── Band 2: 4-col Brand/Links/Связь (cobalt) ───────────────── */}
      <section style={{ background: "var(--color-cobalt)" }}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-14 py-12 md:py-14">
          <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 md:gap-8 lg:gap-14">

            {/* Col 1: Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="inline-flex items-end gap-3 mb-5 text-coral">
                <Hourglass size={28} stroke={1.4} className="text-coral" />
                <div>
                  <div className="wordmark" style={{ fontSize: 22 }}>GALERIE</div>
                  <div className="wordmark-italic" style={{ fontSize: 12, marginTop: 2 }}>du Temps</div>
                </div>
              </Link>
              <p
                className="text-sm leading-relaxed mb-4 max-w-xs"
                style={{
                  fontFamily: "var(--font-italic)",
                  fontStyle:  "italic",
                  color:      "rgba(255,255,255,0.7)",
                }}
              >
                {t.footer.tagline}
              </p>
              <p
                className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.45)" }}
              >
                Алматы · Казахстан
              </p>
            </div>

            {/* Col 2: Магазин */}
            <div>
              <p
                className="text-[10px] uppercase font-medium mb-4"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                {t.footer.shop}
              </p>
              <ul className="space-y-2.5">
                {[
                  { href: "/katalog",           label: t.footer.alle_produkte },
                  /* TODO i18n: footer.neue_eingaenge */
                  { href: "/katalog?sort=neue", label: "Новые поступления" },
                  { href: "/wunschliste",       label: t.footer.meine_wunschliste },
                  /* TODO i18n: nav.quiz */
                  { href: "/quiz",              label: "Квиз" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <FooterLink href={href}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Информация */}
            <div>
              <p
                className="text-[10px] uppercase font-medium mb-4"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                {t.footer.info}
              </p>
              <ul className="space-y-2.5">
                {[
                  { href: "/about",                  label: t.footer.ueber_uns },
                  { href: "/journal",                label: t.nav.journal },
                  { href: "/impressum",              label: t.footer.impressum },
                  { href: "/datenschutz",            label: t.footer.datenschutz },
                  { href: "/affiliate/programm",     label: t.footer.partner_werden },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <FooterLink href={href}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Связь */}
            <div className="col-span-2 md:col-span-1">
              <p
                className="text-[10px] uppercase font-medium mb-4"
                style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
              >
                {t.footer.schreiben_sie}
              </p>
              <a
                href="mailto:bonjour@galeriedutemps.kz"
                className="block text-sm mb-2 hover:text-coral transition-colors"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                bonjour@galeriedutemps.kz
              </a>
              {kontakt.whatsapp_nummer && (
                <a
                  href={wa ?? "#"}
                  target="_blank" rel="noopener noreferrer"
                  className="block text-sm mb-4 hover:text-coral transition-colors"
                  style={{
                    color:      "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-italic)",
                    fontStyle:  "italic",
                  }}
                >
                  {kontakt.whatsapp_nummer}
                </a>
              )}

              {/* Social squares — 34×34, coral letterforms */}
              <div className="flex items-center gap-2 mt-4">
                {ig && <SocialSquare href={ig} label="Instagram">IG</SocialSquare>}
                {tg && <SocialSquare href={tg} label="Telegram">TG</SocialSquare>}
                {wa && <SocialSquare href={wa} label="WhatsApp">WA</SocialSquare>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Band 3: Bottom (cobalt, hairline-cobalt top) ──────────── */}
      <section style={{ background: "var(--color-cobalt)" }}>
        <div className="hairline-cobalt" />
        <div className="max-w-[1440px] mx-auto px-6 md:px-14 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p
            className="text-[10px] uppercase font-medium order-2 md:order-1"
            style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}
          >
            © Galerie du Temps · {jahr} · Алматы
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center order-1 md:order-2">
            <Link href="/datenschutz"      className="text-[10px] uppercase font-medium hover:text-coral transition-colors" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>{t.footer.datenschutz}</Link>
            <Link href="/impressum"        className="text-[10px] uppercase font-medium hover:text-coral transition-colors" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>{t.footer.impressum}</Link>
            <Link href="/affiliate/agb"    className="text-[10px] uppercase font-medium hover:text-coral transition-colors" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}>{t.footer.partner_agb}</Link>
            <button
              data-cookie-settings
              className="text-[10px] uppercase font-medium hover:text-coral transition-colors cursor-pointer"
              style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)" }}
            >
              {t.footer.cookies}
            </button>
          </div>
          <p
            className="text-[10px] uppercase font-medium order-3"
            style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
          >
            ◆ KASPI · HALYK · VISA · MC
          </p>
        </div>
      </section>
    </footer>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm hover:text-coral transition-colors"
      style={{
        color:      "rgba(255,255,255,0.7)",
        fontFamily: "var(--font-italic)",
        fontStyle:  "italic",
      }}
    >
      {children}
    </Link>
  );
}

function SocialSquare({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center text-[11px] uppercase font-medium hover:text-coral transition-colors"
      style={{
        width:         34,
        height:        34,
        border:        "1px solid rgba(255,255,255,0.25)",
        color:         "var(--color-coral)",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </a>
  );
}
