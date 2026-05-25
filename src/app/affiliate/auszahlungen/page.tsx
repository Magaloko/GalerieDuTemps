import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { auszahlungenFuerAffiliate } from "@/lib/db/auszahlungen";
import { provisionsSummenFuer } from "@/lib/db/provisionen";
import { affiliateEinstellungenLaden } from "@/lib/db/affiliate-settings";
import { formatPreis } from "@/lib/utils/preis";
import { Wallet, Clock, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Auszahlungen" };
export const dynamic = "force-dynamic";

export default async function AuszahlungenPage() {
  const session = await auth();
  if (!session) redirect("/affiliate/anmelden");

  const [auszahlungen, summen, settings] = await Promise.all([
    auszahlungenFuerAffiliate(session.user.id).catch(() => []),
    provisionsSummenFuer(session.user.id).catch(() => null),
    affiliateEinstellungenLaden(),
  ]);

  const bestaetigt    = summen?.bestaetigt_cent ?? 0;
  const mindest       = settings.mindestauszahlung_cent;
  const erreicht      = bestaetigt >= mindest;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">Auszahlungen</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">Historie und nächste Auszahlung</p>
      </div>

      {/* Nächste Auszahlung */}
      <div className="bg-vintage-espresso text-vintage-cream p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">Bereit zur Auszahlung</p>
        <p className="font-serif text-4xl">{formatPreis(bestaetigt / 100)}</p>
        <p className="text-vintage-cream/60 text-xs mt-2 font-sans">
          {erreicht
            ? `Mindestbetrag erreicht (${formatPreis(mindest / 100)}). Auszahlung erfolgt im nächsten Batch.`
            : `Mindestbetrag: ${formatPreis(mindest / 100)} — noch ${formatPreis((mindest - bestaetigt) / 100)} bis zur nächsten Auszahlung.`
          }
        </p>
      </div>

      {/* Historie */}
      <section className="bg-vintage-brown border border-vintage-sand/40 p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-cream mb-5">Auszahlungs-Historie</h2>
        {auszahlungen.length === 0 ? (
          <div className="text-center py-10">
            <Wallet className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
            <p className="text-vintage-dust text-sm font-sans">Noch keine Auszahlungen</p>
          </div>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {auszahlungen.map(a => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-serif text-vintage-cream">{formatPreis(a.betrag_cent / 100)}</p>
                  <p className="text-xs text-vintage-dust font-sans flex items-center gap-1">
                    {a.status === "bezahlt"
                      ? <><CheckCircle2 className="w-3 h-3 text-vintage-sage" /> Bezahlt am {a.bezahlt_am ? new Date(a.bezahlt_am).toLocaleDateString("ru-RU") : ""}</>
                      : <><Clock className="w-3 h-3 text-vintage-gold" /> Erstellt am {new Date(a.erstellt_am).toLocaleDateString("ru-RU")}</>
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-vintage-dust uppercase tracking-wider font-sans">{a.methode}</p>
                  {a.referenz && <p className="text-xs text-vintage-cream/80 font-mono mt-0.5">{a.referenz}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
