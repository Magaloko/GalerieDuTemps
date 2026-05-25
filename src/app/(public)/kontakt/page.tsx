import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { KontaktFormular } from "./kontakt-formular";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { kontaktKanaeleLaden, whatsappUrl, telegramUrl } from "@/lib/db/kontakt-kanaele";

export const metadata: Metadata = {
  title:       "Контакты — Galerie du Temps",
  description: "Вопросы или запросы? Мы рады услышать вас.",
};

/** WhatsApp-Nummer → "+7 700 000 00 00" Format */
function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 11 || !d.startsWith("7")) return d ? `+${d}` : "";
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

export default async function KontaktPage() {
  const [{ t }, kontakt] = await Promise.all([
    getDictionary(),
    kontaktKanaeleLaden(),
  ]);

  const wa = whatsappUrl(kontakt.whatsapp_nummer);
  const tg = telegramUrl(kontakt.telegram_channel);
  const phoneText = formatPhoneDisplay(kontakt.whatsapp_nummer);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

      <div className="text-center mb-12">
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
        <h1 className="font-serif text-4xl text-vintage-cream">{t.kontakt_seite.titel}</h1>
        <p className="text-vintage-dust font-sans mt-3 max-w-md mx-auto">
          {t.kontakt_seite.untertitel}
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-10">

        {/* Kontaktinfos */}
        <div className="md:col-span-2 space-y-6">
          <div
            className="bg-vintage-brown/40 border border-vintage-sand/40 p-6 space-y-4"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <p className="font-serif text-lg text-vintage-cream">Galerie du Temps</p>

            <a href="mailto:bonjour@galeriedutemps.kz" className="flex items-start gap-3 group">
              <Mail className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
              <span className="text-sm font-sans text-vintage-cream/80 group-hover:text-vintage-cream transition-colors">
                bonjour@galeriedutemps.kz
              </span>
            </a>

            {phoneText && (
              <a href={`tel:+${kontakt.whatsapp_nummer.replace(/\D/g, "")}`} className="flex items-start gap-3 group">
                <Phone className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm font-sans text-vintage-cream/80 group-hover:text-vintage-cream transition-colors">
                  {phoneText}
                </span>
              </a>
            )}

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
              <span className="text-sm font-sans text-vintage-cream/80">
                Алматы, Казахстан
              </span>
            </div>

            {/* WhatsApp + Telegram als CTA */}
            {(wa || tg) && (
              <div className="pt-4 border-t border-vintage-sand/40 space-y-2">
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-sm font-sans transition-colors"
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t.kontakt_kanal.whatsapp}
                  </a>
                )}
                {tg && (
                  <a
                    href={tg}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] text-sm font-sans transition-colors"
                    style={{ borderRadius: "var(--radius-vintage)" }}
                  >
                    <Send className="w-4 h-4" />
                    {t.kontakt_kanal.telegram}
                  </a>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-vintage-sand/40">
              <p className="text-xs font-sans text-vintage-dust">
                {t.kontakt_seite.oeffnungszeiten}
              </p>
            </div>
          </div>
        </div>

        {/* Formular (Client Component) */}
        <div className="md:col-span-3">
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
          />
        </div>
      </div>
    </div>
  );
}
