import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ArrowRight, Percent, Users, Wallet, ShieldCheck, Sparkles, Coins } from "lucide-react";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Partner-Programm – Verdiene mit Galerie du Temps",
  description: "Werde Partner und verdiene Provisionen für jeden vermittelten Verkauf. Multi-Level-Provisionen bis zu 3 Ebenen.",
};

export const revalidate = 3600;

export default async function PartnerProgrammPage() {
  const settings = await affiliateEinstellungenLaden().catch(() => null);
  const e1 = settings?.provision_ebene_1_prozent ?? 10;
  const e2 = settings?.provision_ebene_2_prozent ?? 3;
  const e3 = settings?.provision_ebene_3_prozent ?? 0;
  const offen = settings?.registrierung_offen ?? true;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1">

        {/* Hero */}
        <section className="relative bg-vintage-espresso texture-paper overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="max-w-2xl">
              <p className="text-vintage-gold text-sm tracking-[0.3em] uppercase mb-4">
                ✦ &nbsp; Partner-Programm
              </p>
              <h1 className="font-serif text-4xl md:text-6xl text-vintage-cream leading-tight mb-6">
                Verdiene mit jedem <em className="text-vintage-gold not-italic">vermittelten Stück</em>
              </h1>
              <p className="text-vintage-cream/70 text-lg leading-relaxed mb-10 font-sans">
                Teile unsere Vintage-Schätze auf Social Media, deinem Blog oder mit Freunden.
                Für jeden vermittelten Verkauf bekommst du eine Provision — und für Verkäufe
                deiner Empfehlungen zusätzlich eine Sub-Provision.
              </p>
              <div className="flex flex-wrap gap-4">
                {offen ? (
                  <Link href="/affiliate/registrieren" className="inline-flex items-center gap-2 px-8 py-4 bg-vintage-gold text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-copper transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
                    Partner werden <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="px-8 py-4 border border-vintage-cream/30 text-vintage-cream/70 font-sans text-sm tracking-widest uppercase" style={{ borderRadius: "var(--radius-button)" }}>
                    Registrierung vorübergehend geschlossen
                  </span>
                )}
                <Link href="/affiliate/anmelden" className="inline-flex items-center gap-2 px-8 py-4 border border-vintage-cream/30 text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-espresso/10 transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
                  Anmelden
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Provisionsmodell */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ Provisionsmodell</p>
            <h2 className="font-serif text-3xl text-vintage-cream">So verdienst du</h2>
            <p className="text-vintage-dust font-sans mt-2 max-w-xl mx-auto">
              Mehrstufiges System — du profitierst direkt von deinen Verkäufen und indirekt
              von denen, die du als Partner geworben hast.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <ProvisionsKarte
              ebene={1}
              prozent={e1}
              titel="Direkt-Provision"
              beschreibung="Für jeden Verkauf, der über deinen Empfehlungs-Link zustande kommt."
              icon={Percent}
              hervorgehoben
            />
            <ProvisionsKarte
              ebene={2}
              prozent={e2}
              titel="Sponsor-Provision"
              beschreibung="Wenn jemand, den du als Partner geworben hast, einen Verkauf vermittelt."
              icon={Users}
            />
            {e3 > 0 && (
              <ProvisionsKarte
                ebene={3}
                prozent={e3}
                titel="Erweiterte Ebene"
                beschreibung="Für Verkäufe der Partner deiner Partner — das volle MLM-Potenzial."
                icon={Sparkles}
              />
            )}
          </div>

          <div className="mt-8 p-5 bg-vintage-brown/40 border border-vintage-sand/40 text-sm font-sans text-vintage-cream/80" style={{ borderRadius: "var(--radius-card)" }}>
            <strong>Rechnungsbeispiel:</strong> Verkauf 500 €, dein Link → <strong>{(500 * e1 / 100).toFixed(2)} €</strong> Direkt-Provision.
            {e2 > 0 && <> Wenn ein von dir geworbener Partner denselben Verkauf vermittelt, bekommst du <strong>{(500 * e2 / 100).toFixed(2)} €</strong> Sponsor-Provision.</>}
          </div>
        </section>

        {/* So funktioniert's */}
        <section className="bg-vintage-brown/40 py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ In 4 Schritten</p>
              <h2 className="font-serif text-3xl text-vintage-cream">So funktioniert es</h2>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { nr: "01", titel: "Registrieren", text: "Kostenlos anmelden, AGB akzeptieren, auf Freischaltung warten." },
                { nr: "02", titel: "Links teilen",  text: "Persönliche Empfehlungs-Links zu beliebigen Produkten erstellen." },
                { nr: "03", titel: "Vermitteln",   text: "Interessenten klicken, kontaktieren — wir wickeln den Verkauf ab." },
                { nr: "04", titel: "Verdienen",    text: "Nach erfolgreichem Verkauf wird deine Provision automatisch gutgeschrieben." },
              ].map((s) => (
                <div key={s.nr} className="bg-vintage-brown border border-vintage-sand/40 p-5" style={{ borderRadius: "var(--radius-card)" }}>
                  <p className="font-serif text-3xl text-vintage-gold mb-2">{s.nr}</p>
                  <p className="font-serif text-lg text-vintage-cream mb-1">{s.titel}</p>
                  <p className="text-vintage-dust text-sm font-sans leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vorteile */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Wallet,      titel: "Schnelle Auszahlungen", text: "Monatliche Auszahlung per SEPA oder PayPal ab 20 € Guthaben." },
              { icon: ShieldCheck, titel: "Faire Bedingungen",     text: "Transparente Konditionen, 14 Tage Widerruf, keine versteckten Kosten." },
              { icon: Coins,       titel: "Lebenslang verdienen",  text: "Cookie hält 30 Tage — du profitierst auch von verzögerten Käufen." },
            ].map(({ icon: Icon, titel, text }) => (
              <div key={titel} className="p-6 bg-vintage-brown border border-vintage-sand/40" style={{ borderRadius: "var(--radius-card)" }}>
                <Icon className="w-6 h-6 text-vintage-gold mb-3" />
                <p className="font-serif text-lg text-vintage-cream mb-2">{titel}</p>
                <p className="text-vintage-dust text-sm font-sans leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-vintage-brown/40 py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦ FAQ</p>
              <h2 className="font-serif text-3xl text-vintage-cream">Häufige Fragen</h2>
            </div>
            <div className="space-y-3">
              {[
                {
                  frage: "Brauche ich ein Gewerbe?",
                  antwort: "Ja, du benötigst entweder ein Gewerbe oder kannst die Kleinunternehmer-Regelung nutzen. Wir weisen dich bei der Registrierung darauf hin.",
                },
                {
                  frage: "Wann wird meine Provision ausgezahlt?",
                  antwort: "Nach erfolgreichem Verkauf wird die Provision sofort gutgeschrieben (Status 'offen'). Nach 14 Tagen Widerrufsfrist wird sie bestätigt. Auszahlung erfolgt monatlich ab 20 € Guthaben.",
                },
                {
                  frage: "Wie lange ist der Tracking-Cookie aktiv?",
                  antwort: "Klickt ein Interessent deinen Link, wird ein Cookie für 30 Tage gesetzt. Kauft die Person innerhalb dieser Zeit, bekommst du die Provision.",
                },
                {
                  frage: "Was passiert bei einer Retoure?",
                  antwort: "Wenn ein Kunde innerhalb der 14-Tage-Widerrufsfrist zurücktritt, wird die Provision storniert. Nach Ablauf der Frist ist die Provision endgültig.",
                },
                {
                  frage: "Kann ich selbst kaufen und Provision bekommen?",
                  antwort: "Nein. Self-Purchase wird automatisch erkannt und blockiert (gleiche E-Mail-Adresse). Das wäre nicht im Sinne des Programms.",
                },
              ].map((q) => (
                <details key={q.frage} className="bg-vintage-brown border border-vintage-sand/40 p-5 group" style={{ borderRadius: "var(--radius-card)" }}>
                  <summary className="font-serif text-vintage-cream cursor-pointer list-none flex items-center justify-between">
                    {q.frage}
                    <span className="text-vintage-gold group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-vintage-dust text-sm font-sans mt-3 leading-relaxed">{q.antwort}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-3">✦</p>
          <h2 className="font-serif text-3xl text-vintage-cream mb-4">Bereit anzufangen?</h2>
          <p className="text-vintage-cream/80 font-sans mb-8 max-w-md mx-auto">
            Die Registrierung dauert 2 Minuten. Nach Freischaltung kannst du sofort
            deine ersten Empfehlungs-Links erstellen.
          </p>
          {offen && (
            <Link href="/affiliate/registrieren" className="inline-flex items-center gap-2 px-8 py-4 bg-vintage-espresso text-vintage-cream font-sans text-sm tracking-widest uppercase hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
              Jetzt Partner werden <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProvisionsKarte({
  ebene, prozent, titel, beschreibung, icon: Icon, hervorgehoben = false,
}: {
  ebene: number; prozent: number; titel: string; beschreibung: string;
  icon: React.ElementType; hervorgehoben?: boolean;
}) {
  return (
    <div
      className={`
        relative p-6 border
        ${hervorgehoben
          ? "bg-vintage-gold/10 border-vintage-gold"
          : "bg-vintage-brown border-vintage-sand/40"
        }
      `}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <p className="text-vintage-dust text-xs font-sans uppercase tracking-widest">Ebene {ebene}</p>
      <p className="font-serif text-5xl text-vintage-gold mt-1">{prozent}%</p>
      <div className="flex items-center gap-2 mt-3 mb-2">
        <Icon className="w-4 h-4 text-vintage-cream/80" />
        <p className="font-serif text-lg text-vintage-cream">{titel}</p>
      </div>
      <p className="text-vintage-dust text-sm font-sans leading-relaxed">{beschreibung}</p>
    </div>
  );
}
