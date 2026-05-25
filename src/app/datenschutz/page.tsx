import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Datenschutzerklärung – Galerie du Temps",
  description: "Informationen zum Umgang mit personenbezogenen Daten gemäß DSGVO",
};
export const revalidate = 3600;

export default async function DatenschutzPage() {
  const sys = await systemEinstellungenLaden();
  const stand = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        <div className="border-b border-vintage-sand pb-6">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso">Datenschutzerklärung</h1>
          <p className="text-vintage-dust text-xs font-sans mt-2">Stand: {stand}</p>
        </div>

        <div className="flex items-start gap-3 p-5 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-sans">
            <strong>Template-Hinweis:</strong> Vorlage — bitte vor Live-Gang von Anwalt / DSGVO-Beauftragten
            prüfen und an verwendete Tools (Brevo, DeepSeek, Stripe, etc.) anpassen.
          </p>
        </div>

        <article className="text-vintage-ink font-sans leading-relaxed space-y-6 text-sm">

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">1. Verantwortlicher</h2>
            <div className="ml-4 my-3 p-3 bg-vintage-parchment border border-vintage-sand text-xs" style={{ borderRadius: "var(--radius-vintage)" }}>
              {sys.firma_name}<br/>
              {sys.firma_strasse}<br/>
              {sys.firma_plz} {sys.firma_ort}<br/>
              {sys.firma_email && <>E-Mail: {sys.firma_email}<br/></>}
              {sys.firma_telefon && <>Telefon: {sys.firma_telefon}</>}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">2. Erhobene Daten</h2>
            <h3 className="font-serif text-vintage-brown mt-3">Beim Besuch der Website</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Server-Logs (IP-Adresse, Zugriffszeitpunkt, abgerufene Seite, User-Agent) — technisch notwendig, Speicherdauer max. 7 Tage</li>
              <li>Cookies — nur mit Einwilligung (siehe Cookie-Banner)</li>
            </ul>
            <h3 className="font-serif text-vintage-brown mt-3">Beim Kontaktformular</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Name, E-Mail, Nachricht, ggf. Produktreferenz</li>
              <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen)</li>
            </ul>
            <h3 className="font-serif text-vintage-brown mt-3">Beim Partner-Programm</h3>
            <ul className="list-disc ml-6 space-y-1">
              <li>Stammdaten, Bankverbindung (IBAN verschlüsselt mit pgcrypto), Steuer-ID</li>
              <li>Klick-Logs mit gehashter IP/User-Agent — pseudonymisiert, max. 90 Tage</li>
              <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">3. Cookies & Tracking</h2>
            <p>Wir verwenden folgende Cookie-Kategorien:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Notwendig:</strong> Session-Token (NextAuth), CSRF-Schutz — keine Einwilligung erforderlich</li>
              <li><strong>Affiliate-Tracking:</strong> Cookie <code className="bg-vintage-parchment px-1">aff_ref</code> (HttpOnly, 30 Tage) — nur mit Einwilligung. Ordnet Käufe Affiliate-Partnern zu.</li>
              <li><strong>Analytics:</strong> (aktuell deaktiviert) — wird ggf. später ergänzt</li>
            </ul>
            <p className="mt-3">Du kannst deine Cookie-Einstellungen jederzeit über den Footer-Link „Cookie-Einstellungen" ändern.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">4. Auftragsverarbeiter</h2>
            <p>Wir setzen folgende Dienstleister mit AV-Vertrag ein:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Brevo SAS (Frankreich)</strong> — Transaktionale E-Mails. <a className="text-vintage-brown underline" href="https://www.brevo.com/legal/privacypolicy/" target="_blank" rel="noopener">Datenschutz</a></li>
              <li><strong>DeepSeek (China)</strong> — KI-Assistent (nur Chat-Inhalte, keine Personendaten). <a className="text-vintage-brown underline" href="https://www.deepseek.com" target="_blank" rel="noopener">Datenschutz</a></li>
              {sys.stripe_connect_enabled && (
                <li><strong>Stripe (Irland)</strong> — Zahlungsabwicklung Partner-Auszahlungen. <a className="text-vintage-brown underline" href="https://stripe.com/de/privacy" target="_blank" rel="noopener">Datenschutz</a></li>
              )}
              <li><strong>Hostinger (EU)</strong> — Hosting</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">5. Deine Rechte</h2>
            <p>Gemäß DSGVO hast du folgende Rechte uns gegenüber:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li>Auskunft (Art. 15)</li>
              <li>Berichtigung (Art. 16)</li>
              <li>Löschung (Art. 17)</li>
              <li>Einschränkung (Art. 18)</li>
              <li>Datenübertragbarkeit (Art. 20)</li>
              <li>Widerspruch (Art. 21)</li>
              <li>Widerruf der Einwilligung jederzeit (Art. 7)</li>
            </ul>
            <p className="mt-3">Anfragen bitte an: {sys.firma_email || "[E-Mail einsetzen]"}</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">6. Beschwerderecht</h2>
            <p>Du hast das Recht, dich bei der zuständigen Aufsichtsbehörde zu beschweren
            (z.B. Landesbeauftragter für Datenschutz).</p>
          </section>

          <p className="text-vintage-dust text-xs italic pt-6 border-t border-vintage-sand">
            Stand: {stand}
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
