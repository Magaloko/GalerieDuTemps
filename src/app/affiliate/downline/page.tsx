import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { downlineLaden } from "@/lib/db/affiliates";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meine Partner" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; klasse: string }> = {
  pending:    { text: "Wartet auf Freischaltung", klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  aktiv:      { text: "Aktiv",                     klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  gesperrt:   { text: "Gesperrt",                  klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
  geloescht:  { text: "Gelöscht",                  klasse: "text-vintage-dust     bg-vintage-dust/10"     },
};

export default async function DownlinePage() {
  const session = await auth();
  if (!session) redirect("/affiliate/anmelden");

  const downline = await downlineLaden(session.user.id);
  const ebene1   = downline.filter(d => d.ebene_relativ === 1);
  const ebene2   = downline.filter(d => d.ebene_relativ === 2);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">Meine Partner</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {ebene1.length} direkt geworben · {ebene2.length} indirekt
        </p>
      </div>

      {downline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Users className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-brown">Noch keine geworbenen Partner</p>
          <p className="text-vintage-dust text-sm font-sans mt-1 max-w-xs">
            Teile deinen Referral-Code und verdiene auch an Verkäufen deiner Partner.
          </p>
        </div>
      ) : (
        <>
          {/* Ebene 1 */}
          <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg text-vintage-espresso">Direkt geworben (Ebene 1)</h2>
              <span className="text-xs text-vintage-dust font-sans">{ebene1.length} Partner</span>
            </div>
            {ebene1.length === 0
              ? <p className="text-vintage-dust text-sm font-sans py-4 text-center">Noch keine direkten Partner</p>
              : <DownlineListe items={ebene1} />
            }
          </section>

          {/* Ebene 2 */}
          {ebene2.length > 0 && (
            <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-vintage-espresso">Indirekt (Ebene 2)</h2>
                <span className="text-xs text-vintage-dust font-sans">{ebene2.length} Partner</span>
              </div>
              <DownlineListe items={ebene2} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DownlineListe({ items }: { items: Awaited<ReturnType<typeof downlineLaden>> }) {
  return (
    <div className="divide-y divide-vintage-sand/40">
      {items.map(p => {
        const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.aktiv;
        return (
          <div key={p.id} className="py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-serif text-vintage-espresso truncate">{p.vorname} {p.nachname}</p>
              <p className="text-xs text-vintage-dust font-sans">
                Seit {new Date(p.erstellt_am).toLocaleDateString("de-DE")}
              </p>
            </div>
            <span className={`inline-block px-2 py-0.5 text-xs font-sans ${status.klasse}`}
              style={{ borderRadius: "var(--radius-vintage)" }}>
              {status.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
