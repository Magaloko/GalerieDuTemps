import { alleAuszahlungen, auszahlungsKandidaten } from "@/lib/db/auszahlungen";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { formatPreis } from "@/lib/utils/preis";
import { Wallet, CheckCircle2, Clock } from "lucide-react";
import { AuszahlungErstellenButton } from "./auszahlung-erstellen-button";
import { BezahltButton } from "./bezahlt-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Auszahlungen" };
export const dynamic = "force-dynamic";

export default async function AdminAuszahlungenPage() {
  const settings = await affiliateEinstellungenLaden();
  const [kandidaten, historie] = await Promise.all([
    auszahlungsKandidaten(settings.mindestauszahlung_cent).catch(() => []),
    alleAuszahlungen({ limit: 50 }).catch(() => []),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Auszahlungen</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Mindestbetrag: {formatPreis(settings.mindestauszahlung_cent / 100)}
          </p>
        </div>
        <a
          href="/api/admin/auszahlungen/sepa-export?all=true"
          download
          className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
          title="Alle offenen SEPA-Auszahlungen als XML-Datei (für Banking-Software)"
        >
          📥 SEPA-XML Export
        </a>
      </div>

      {/* Auszahlungs-Kandidaten */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-vintage-espresso">Bereit zur Auszahlung</h2>
          <span className="text-xs text-vintage-dust font-sans">{kandidaten.length} Affiliates</span>
        </div>
        {kandidaten.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
            <p className="text-vintage-dust text-sm font-sans">Keine Auszahlungen ausstehend</p>
            <p className="text-xs text-vintage-dust font-sans mt-1">Provisionen müssen bestätigt und den Mindestbetrag erreichen.</p>
          </div>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {kandidaten.map(k => (
              <div key={k.affiliate_id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-vintage-espresso">{k.affiliate_name}</p>
                  <p className="text-xs text-vintage-dust font-sans">
                    {k.affiliate_email} · {k.anzahl_provisionen} Provisionen · {k.auszahlungs_methode.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-serif text-vintage-espresso text-lg">{formatPreis(k.summe_cent / 100)}</p>
                  </div>
                  <AuszahlungErstellenButton
                    affiliateId={k.affiliate_id}
                    methode={k.auszahlungs_methode}
                    summeCent={k.summe_cent}
                    affiliateName={k.affiliate_name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Historie */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso mb-4">Historie</h2>
        {historie.length === 0 ? (
          <p className="text-vintage-dust text-sm font-sans text-center py-6">Noch keine Auszahlungen</p>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {historie.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-vintage-espresso">{a.affiliate_name}</p>
                  <p className="text-xs text-vintage-dust font-sans flex items-center gap-1">
                    {a.status === "bezahlt"
                      ? <><CheckCircle2 className="w-3 h-3 text-vintage-sage" /> Bezahlt am {a.bezahlt_am ? new Date(a.bezahlt_am).toLocaleDateString("de-DE") : ""}</>
                      : <><Clock className="w-3 h-3 text-vintage-gold" /> {new Date(a.erstellt_am).toLocaleDateString("de-DE")}</>
                    }
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-serif text-vintage-espresso">{formatPreis(a.betrag_cent / 100)}</p>
                    <p className="text-xs text-vintage-dust uppercase tracking-wider">{a.methode}</p>
                  </div>
                  {a.status === "erstellt" && <BezahltButton auszahlungId={a.id} />}
                  {a.status === "bezahlt"  && (
                    <a
                      href={`/admin/auszahlungen/${a.id}/beleg`}
                      target="_blank"
                      className="px-2 py-1 border border-vintage-sand text-vintage-dust text-xs font-sans hover:bg-vintage-parchment transition-colors"
                      style={{ borderRadius: "var(--radius-vintage)" }}
                    >
                      Beleg
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
