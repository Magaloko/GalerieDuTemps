import Link from "next/link";
import { Store } from "lucide-react";
import type { Dictionary } from "@/i18n";
import {
  type KontaktKanaele,
  whatsappUrl,
  telegramUrl,
  instagramUrl,
} from "@/lib/db/kontakt-kanaele";

/** Inline-SVG für WhatsApp (keine zusätzliche Icon-Lib) */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M19.05 4.91A10 10 0 0 0 12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.47 1.34 4.99L2 22l5.2-1.37a9.95 9.95 0 0 0 4.84 1.23h.01c5.49 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.96-7.04zm-7.01 15.3a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.09.81.82-3-.2-.31a8.26 8.26 0 0 1-1.27-4.4c0-4.57 3.72-8.29 8.29-8.29 2.22 0 4.3.86 5.86 2.42a8.23 8.23 0 0 1 2.42 5.87c.01 4.57-3.71 8.24-8.31 8.24zm4.55-6.18c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13s-.64.81-.78.97c-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.38-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.85.83-.85 2.03 0 1.2.87 2.36.99 2.52.13.17 1.72 2.62 4.16 3.67.58.25 1.04.4 1.39.51.58.18 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M21.95 4.41 18.5 20.79c-.27 1.18-.97 1.47-1.97.91l-5.44-4.01-2.62 2.52c-.29.29-.53.53-1.09.53l.39-5.51 10.02-9.05c.43-.39-.1-.6-.66-.22L5 12.92l-5.32-1.66C-1.48 10.91-1.5 10.1.95 9.13l19.43-7.49c.97-.36 1.82.22 1.57 2.77z" transform="translate(1.5 0)" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer({
  t,
  kontakt,
  jahr,
}: {
  t: Dictionary;
  kontakt: KontaktKanaele;
  jahr: number;
}) {
  const wa = whatsappUrl(kontakt.whatsapp_nummer);
  const tg = telegramUrl(kontakt.telegram_channel);
  const ig = instagramUrl(kontakt.instagram_handle);
  const hatSozial = Boolean(wa || tg || ig);

  return (
    <footer className="bg-vintage-espresso text-vintage-cream/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Marke */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-4 h-4 text-vintage-gold" />
              <span className="font-serif text-lg text-vintage-cream">Galerie du Temps</span>
            </div>
            <p className="text-sm leading-relaxed text-vintage-cream/60">
              {t.footer.tagline}
            </p>
          </div>

          {/* Shop-Links */}
          <div>
            <p className="text-xs uppercase tracking-widest text-vintage-gold mb-4">{t.footer.shop}</p>
            <ul className="space-y-2">
              {[
                { href: "/katalog",     label: t.footer.alle_produkte },
                { href: "/kategorien",  label: t.nav.kategorien },
                { href: "/wunschliste", label: t.footer.meine_wunschliste },
                { href: "/kontakt",     label: t.nav.kontakt },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-vintage-cream/60 hover:text-vintage-cream transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info-Links */}
          <div>
            <p className="text-xs uppercase tracking-widest text-vintage-gold mb-4">{t.footer.info}</p>
            <ul className="space-y-2">
              {[
                { href: "/about",               label: t.footer.ueber_uns },
                { href: "/journal",             label: t.nav.journal },
                { href: "/newsletter/anmelden", label: t.newsletter.titel },
                { href: "/kontakt",             label: t.footer.anfrage_stellen },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-vintage-cream/60 hover:text-vintage-cream transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontakt-Kanäle */}
          <div>
            <p className="text-xs uppercase tracking-widest text-vintage-gold mb-4">
              {hatSozial ? t.footer.folge_uns : t.footer.schreiben_sie}
            </p>
            <div className="flex items-center gap-3">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.kontakt_kanal.whatsapp}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-vintage-gold/20 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <WhatsAppIcon className="w-5 h-5" />
                </a>
              )}
              {tg && (
                <a
                  href={tg}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.kontakt_kanal.telegram}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-vintage-gold/20 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <TelegramIcon className="w-5 h-5" />
                </a>
              )}
              {ig && (
                <a
                  href={ig}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.kontakt_kanal.instagram}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-vintage-gold/20 text-vintage-cream/70 hover:text-vintage-gold transition-colors"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <InstagramIcon className="w-5 h-5" />
                </a>
              )}
            </div>
            <p className="text-xs text-vintage-cream/40 mt-4">
              <a
                href="mailto:bonjour@galeriedutemps.kz"
                className="hover:text-vintage-cream transition-colors"
              >
                bonjour@galeriedutemps.kz
              </a>
            </p>
          </div>
        </div>

        {/* Legal-Links */}
        <div className="border-t border-white/10 mt-10 pt-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center text-xs text-vintage-cream/40">
            <Link href="/impressum"        className="hover:text-vintage-cream transition-colors">{t.footer.impressum}</Link>
            <Link href="/datenschutz"      className="hover:text-vintage-cream transition-colors">{t.footer.datenschutz}</Link>
            <Link href="/affiliate/agb"    className="hover:text-vintage-cream transition-colors">{t.footer.partner_agb}</Link>
            <Link href="/affiliate/programm" className="hover:text-vintage-cream transition-colors">{t.footer.partner_werden}</Link>
            <button
              data-cookie-settings
              className="hover:text-vintage-cream transition-colors cursor-pointer"
            >
              {t.footer.cookies}
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-vintage-cream/40">
            © {jahr} Galerie du Temps. {t.footer.alle_rechte}.
          </p>
          <p className="text-vintage-gold text-sm">✦</p>
        </div>
      </div>
    </footer>
  );
}
