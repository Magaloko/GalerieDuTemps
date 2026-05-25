import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { affiliateById } from "@/lib/db/affiliates";
import { formatPreis } from "@/lib/utils/preis";
import { PrintButton } from "./print-button";
import type { Auszahlung, Provision } from "@/types/affiliate";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gutschrift-Beleg" };
export const dynamic = "force-dynamic";

interface DetailRow extends Provision {
  produkt_name: string | null;
}

export default async function BelegPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auszahlung laden
  const auszahlungRes = await query<Auszahlung>(
    `SELECT * FROM sebo.auszahlungen WHERE id = $1`,
    [id]
  );
  const auszahlung = auszahlungRes.rows[0];
  if (!auszahlung) notFound();

  // Affiliate-Daten + Provisions-Details
  const [affiliate, provisionenRes] = await Promise.all([
    affiliateById(auszahlung.affiliate_id),
    query<DetailRow>(
      `SELECT p.*, pr.name AS produkt_name
       FROM sebo.provisionen p
       LEFT JOIN sebo.produkte pr ON pr.id = p.produkt_id
       WHERE p.auszahlung_id = $1
       ORDER BY p.erstellt_am`,
      [id]
    ),
  ]);

  if (!affiliate) notFound();

  const datum = new Date(auszahlung.erstellt_am).toLocaleDateString("de-DE");
  const belegnr = `GDT-${id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Print-Button (nur Bildschirm) */}
      <div className="print:hidden p-4 bg-vintage-parchment border-b border-vintage-sand flex items-center justify-between">
        <p className="text-sm font-sans text-vintage-brown">Gutschrift-Beleg #{belegnr}</p>
        <PrintButton />
      </div>

      {/* Beleg-Inhalt (druckbar) */}
      <div className="max-w-3xl mx-auto p-8 sm:p-12 font-sans text-black">
        {/* Kopfzeile */}
        <div className="flex justify-between items-start mb-12 border-b-2 border-black pb-6">
          <div>
            <p className="text-vintage-gold text-2xl tracking-widest mb-1">✦</p>
            <h1 className="font-serif text-3xl text-black">Galerie du Temps</h1>
            <p className="text-sm text-black/70 mt-2">
              Musterstraße 1<br/>
              10115 Berlin<br/>
              Deutschland<br/>
              hallo@galeriedutemps.kz
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-serif text-2xl text-black mb-1">Gutschrift</h2>
            <p className="text-sm text-black/70">Beleg-Nr.: <strong>{belegnr}</strong></p>
            <p className="text-sm text-black/70">Datum: <strong>{datum}</strong></p>
          </div>
        </div>

        {/* Empfänger */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-black/50 mb-2">Gutschrift an</p>
          <p className="text-base text-black font-serif">
            {affiliate.vorname} {affiliate.nachname}
          </p>
          <p className="text-sm text-black/70">{affiliate.email}</p>
          {affiliate.steuer_id && (
            <p className="text-sm text-black/70 mt-1">Steuer-ID: {affiliate.steuer_id}</p>
          )}
        </div>

        {/* Provisions-Tabelle */}
        <table className="w-full mb-8 border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left  py-2 text-xs uppercase tracking-widest font-normal">Bezeichnung</th>
              <th className="text-center py-2 text-xs uppercase tracking-widest font-normal">Ebene</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">Basis</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">Satz</th>
              <th className="text-right py-2 text-xs uppercase tracking-widest font-normal">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {provisionenRes.rows.map(p => (
              <tr key={p.id} className="border-b border-black/20">
                <td className="py-2 text-black">
                  Vermittlungsprovision{p.produkt_name ? ` – ${p.produkt_name}` : ""}
                </td>
                <td className="py-2 text-center text-black/70">L{p.ebene}</td>
                <td className="py-2 text-right text-black/70">{formatPreis(p.verkaufspreis_cent / 100)}</td>
                <td className="py-2 text-right text-black/70">{p.satz_prozent}%</td>
                <td className="py-2 text-right text-black font-serif">{formatPreis(p.betrag_cent / 100)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={4} className="py-3 text-right font-serif text-base">Gesamtbetrag</td>
              <td className="py-3 text-right font-serif text-xl">{formatPreis(auszahlung.betrag_cent / 100)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Steuer-Hinweis */}
        <div className="mb-8 p-4 border border-black/20 bg-black/5">
          {affiliate.ist_kleinunternehmer ? (
            <p className="text-xs text-black leading-relaxed">
              <strong>Hinweis:</strong> Gemäß § 19 Abs. 1 UStG wird keine Umsatzsteuer berechnet
              (Kleinunternehmerregelung). Der ausgewiesene Betrag ist endgültig.
            </p>
          ) : (
            <p className="text-xs text-black leading-relaxed">
              <strong>Hinweis:</strong> Diese Gutschrift wird gemäß § 14 Abs. 2 Satz 2 UStG vom
              Leistungsempfänger (Galerie du Temps) ausgestellt. Bitte prüfe diese Gutschrift
              und widersprich ggf. innerhalb von 14 Tagen schriftlich.
              {!affiliate.steuer_id && <> Bitte teile uns deine Steuer-Nr. mit.</>}
            </p>
          )}
        </div>

        {/* Zahlungsinfo */}
        <div className="mb-12 text-sm">
          <p className="text-xs uppercase tracking-widest text-black/50 mb-2">Zahlungsweise</p>
          <p className="text-black">
            {auszahlung.methode === "sepa" ? "SEPA-Überweisung" : "PayPal"}
          </p>
          {auszahlung.status === "bezahlt" && auszahlung.bezahlt_am && (
            <p className="text-xs text-black/70 mt-1">
              Bezahlt am {new Date(auszahlung.bezahlt_am).toLocaleDateString("de-DE")}
            </p>
          )}
          {auszahlung.status === "erstellt" && (
            <p className="text-xs text-black/70 mt-1">Status: Zahlung in Vorbereitung</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-black/20 pt-6 text-xs text-black/50 leading-relaxed">
          <p>
            Galerie du Temps · Affiliate-Partner-Programm<br/>
            Bei Fragen wende dich an hallo@galeriedutemps.kz
          </p>
          <p className="mt-2">
            Diese Gutschrift wurde maschinell erstellt und ist ohne Unterschrift gültig.
          </p>
        </div>
      </div>

      {/* Print-Styles */}
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
