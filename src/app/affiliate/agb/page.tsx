import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "Partner-AGB – Galerie du Temps",
  description: "Allgemeine Geschäftsbedingungen für das Partner-/Affiliate-Programm",
};
export const revalidate = 3600;

export default async function AgbPage() {
  const [sys, aff] = await Promise.all([
    systemEinstellungenLaden(),
    affiliateEinstellungenLaden(),
  ]);

  const stand = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        <div className="border-b border-vintage-sand pb-6">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso">Partner-AGB</h1>
          <p className="text-vintage-dust text-xs font-sans mt-2">
            Version <strong>{aff.agb_aktuelle_version}</strong> · Stand {stand}
          </p>
        </div>

        {/* TEMPLATE-WARNUNG */}
        <div className="flex items-start gap-3 p-5 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy" style={{ borderRadius: "var(--radius-card)" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-sans space-y-2">
            <p><strong>Vorlagen-Hinweis (vor Live-Gang entfernen):</strong></p>
            <p>Diese AGB sind ein <strong>Template / Muster</strong> und keine Rechtsberatung.
            Lasse den Text vor dem produktiven Einsatz von einem auf E-Commerce/Affiliate-Marketing
            spezialisierten Rechtsanwalt prüfen und an dein Geschäftsmodell anpassen.</p>
            <p>Insbesondere zu prüfen: Versionierung, Widerrufsbelehrung, Datenschutz-Verweise,
            Steuerregelungen (Gutschriftverfahren §14 UStG), Schneeballsystem-Abgrenzung (§16 UWG)
            bei MLM-Strukturen.</p>
          </div>
        </div>

        <article className="prose max-w-none text-vintage-ink font-sans leading-relaxed space-y-6 text-sm">

          {/* §1 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 1 Vertragspartner & Geltungsbereich</h2>
            <p>(1) Diese Allgemeinen Geschäftsbedingungen gelten für die Teilnahme am Partner-Programm von:</p>
            <p className="ml-4 my-3 p-3 bg-vintage-parchment border border-vintage-sand text-xs" style={{ borderRadius: "var(--radius-vintage)" }}>
              {sys.firma_name || "[Firmenname]"}<br/>
              {sys.firma_strasse || "[Straße]"}<br/>
              {sys.firma_plz} {sys.firma_ort || "[PLZ Ort]"}<br/>
              {sys.firma_email && <>E-Mail: {sys.firma_email}<br/></>}
              {sys.firma_handelsregister && <>Handelsregister: {sys.firma_handelsregister}<br/></>}
              {sys.firma_ust_id && <>USt-IdNr.: {sys.firma_ust_id}</>}
            </p>
            <p>(2) Vertragspartner („Partner") sind ausschließlich Unternehmer i.S.d. § 14 BGB sowie
            Kleinunternehmer i.S.d. § 19 UStG mit gewerblicher Anmeldung. Verbraucher sind ausgeschlossen.</p>
            <p>(3) Es gelten ausschließlich diese AGB. Abweichende Bedingungen werden nicht anerkannt.</p>
          </section>

          {/* §2 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 2 Leistung des Partners</h2>
            <p>(1) Der Partner bewirbt die Produkte des Vertragspartners auf eigenen Werbeflächen
            (Website, Blog, Social Media, E-Mail an eigene Kontakte) und vermittelt potenzielle Käufer.</p>
            <p>(2) Die Vermittlung erfolgt über personalisierte Empfehlungs-Links mit einem
            Tracking-Code. Käufe, die innerhalb der Cookie-Laufzeit
            ({aff.cookie_ttl_tage} Tage) zustande kommen, werden dem Partner zugeordnet (Last-Click).</p>
            <p>(3) Der Partner verpflichtet sich, die werblichen Inhalte gemäß § 5a UWG eindeutig als
            Werbung zu kennzeichnen („Werbung", „Anzeige", „#Werbung").</p>
          </section>

          {/* §3 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 3 Provision</h2>
            <p>(1) Für jeden erfolgreich vermittelten Verkauf erhält der Partner eine Provision in
            Höhe von <strong>{aff.provision_ebene_1_prozent}%</strong> des Netto-Verkaufspreises (Ebene 1).</p>
            <p>(2) Hat der Partner einen weiteren Partner geworben (Sponsor-Provision), erhält er für
            Verkäufe dieses Sub-Partners <strong>{aff.provision_ebene_2_prozent}%</strong> (Ebene 2).
            {aff.provision_ebene_3_prozent > 0 && <> Für die dritte Ebene werden <strong>{aff.provision_ebene_3_prozent}%</strong> vergütet.</>}</p>
            <p>(3) <strong>Hinweis zur Schneeballsystem-Abgrenzung:</strong> Provisionen werden ausschließlich
            für tatsächliche Produktverkäufe gezahlt. Es wird zu keinem Zeitpunkt Vergütung allein für
            die Anwerbung neuer Partner gewährt.</p>
            <p>(4) Die Provision entsteht bei manueller Bestätigung des Verkaufs durch den Vertragspartner
            (Status „offen") und wird nach Ablauf der gesetzlichen Widerrufsfrist von
            {" "}{aff.widerrufs_frist_tage} Tagen bestätigt.</p>
            <p>(5) Bei Retoure, Stornierung oder Rückabwicklung erlischt der Provisionsanspruch.</p>
          </section>

          {/* §4 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 4 Auszahlung</h2>
            <p>(1) Die Auszahlung erfolgt monatlich, sofern der angesammelte Betrag den Mindestbetrag
            von <strong>{(aff.mindestauszahlung_cent / 100).toFixed(2).replace(".", ",")} €</strong> erreicht.</p>
            <p>(2) Auszahlungsmethoden: SEPA-Überweisung oder PayPal — wählbar im Partner-Profil.</p>
            <p>(3) Bei Kleinunternehmern erfolgt die Auszahlung gemäß § 19 UStG ohne Umsatzsteuer-Ausweis.
            Bei umsatzsteuerpflichtigen Partnern wird eine Gutschrift gemäß § 14 Abs. 2 Satz 2 UStG erstellt.</p>
            <p>(4) Der Partner verpflichtet sich, korrekte Bankdaten / PayPal-Adresse sowie Steuer-ID im
            Partner-Profil zu hinterlegen.</p>
          </section>

          {/* §5 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 5 Pflichten des Partners</h2>
            <p>(1) Der Partner garantiert, dass seine Werbung den geltenden Gesetzen entspricht
            (UWG, Markenrecht, Urheberrecht, DSGVO).</p>
            <p>(2) Verboten sind insbesondere:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Spam, unaufgeforderte E-Mails / DMs</li>
              <li>Brand-Bidding (Werbung auf Markennamen des Vertragspartners)</li>
              <li>Cookie-Stuffing, Adware, Cookie-Manipulation</li>
              <li>Self-Purchase (Vermittlung an die eigene Person — wird automatisch blockiert)</li>
              <li>Irreführende oder rechtswidrige Werbeaussagen</li>
            </ul>
            <p>(3) Verstöße führen zur sofortigen Sperrung und ggf. Schadensersatzforderung.</p>
          </section>

          {/* §6 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 6 Vertragslaufzeit / Kündigung</h2>
            <p>(1) Das Vertragsverhältnis beginnt mit Freischaltung des Partner-Accounts durch den
            Vertragspartner und läuft auf unbestimmte Zeit.</p>
            <p>(2) Beide Parteien können jederzeit ohne Angabe von Gründen kündigen.</p>
            <p>(3) Bei Kündigung werden bereits entstandene, bestätigte Provisionen wie üblich ausgezahlt.</p>
          </section>

          {/* §7 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 7 Datenschutz</h2>
            <p>Die Verarbeitung personenbezogener Daten erfolgt gemäß DSGVO und unserer
            <a href="/datenschutz" className="text-vintage-brown underline ml-1">Datenschutzerklärung</a>.
            Tracking-Cookies werden nur mit ausdrücklicher Einwilligung des Besuchers gesetzt.</p>
          </section>

          {/* §8 */}
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso">§ 8 Schlussbestimmungen</h2>
            <p>(1) Es gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist
            {sys.firma_ort ? ` ${sys.firma_ort}` : " der Sitz des Vertragspartners"}, soweit gesetzlich zulässig.</p>
            <p>(2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt
            (salvatorische Klausel).</p>
            <p>(3) Änderungen der AGB werden mindestens 30 Tage vor Inkrafttreten per E-Mail mitgeteilt.
            Widerspricht der Partner nicht innerhalb dieser Frist, gelten die neuen AGB als akzeptiert.</p>
          </section>

          <p className="text-vintage-dust text-xs italic pt-6 border-t border-vintage-sand">
            Stand: {stand} · AGB-Version {aff.agb_aktuelle_version}
          </p>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
