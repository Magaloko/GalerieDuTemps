import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { systemEinstellungenLaden } from "@/lib/db/system-einstellungen";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum – Galerie du Temps" };
export const revalidate = 3600;

export default async function ImpressumPage() {
  const sys = await systemEinstellungenLaden();

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="border-b border-vintage-sand pb-6">
          <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
          <h1 className="font-serif text-3xl text-vintage-espresso">Impressum</h1>
          <p className="text-vintage-dust text-xs font-sans mt-2">Angaben gemäß § 5 TMG</p>
        </div>

        <article className="font-sans text-vintage-ink leading-relaxed space-y-5 text-sm">
          <section>
            <h2 className="font-serif text-xl text-vintage-espresso mb-2">Anbieter</h2>
            <p>
              {sys.firma_name}<br/>
              {sys.firma_strasse}<br/>
              {sys.firma_plz} {sys.firma_ort}<br/>
              {sys.firma_land}
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso mb-2">Kontakt</h2>
            <p>
              {sys.firma_email && <>E-Mail: {sys.firma_email}<br/></>}
              {sys.firma_telefon && <>Telefon: {sys.firma_telefon}</>}
            </p>
          </section>

          {sys.firma_handelsregister && (
            <section>
              <h2 className="font-serif text-xl text-vintage-espresso mb-2">Handelsregister</h2>
              <p>{sys.firma_handelsregister}</p>
            </section>
          )}

          {(sys.firma_steuer_id || sys.firma_ust_id) && (
            <section>
              <h2 className="font-serif text-xl text-vintage-espresso mb-2">Steuern</h2>
              {sys.firma_steuer_id && <p>Steuer-Nr.: {sys.firma_steuer_id}</p>}
              {sys.firma_ust_id    && <p>USt-IdNr.: {sys.firma_ust_id}</p>}
            </section>
          )}

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso mb-2">Verantwortlich für Inhalte</h2>
            <p>{sys.firma_name}, Anschrift wie oben.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-vintage-espresso mb-2">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a className="text-vintage-brown underline" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener">
                https://ec.europa.eu/consumers/odr
              </a>
              .
            </p>
            <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
