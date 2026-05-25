import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { provisionenFuerAffiliate } from "@/lib/db/provisionen";
import { formatPreis } from "@/lib/utils/preis";
import Link from "next/link";
import { Coins } from "lucide-react";
import type { Metadata } from "next";
import type { ProvisionStatus } from "@/types/affiliate";

export const metadata: Metadata = { title: "Meine Provisionen" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ProvisionStatus, { label: string; color: string }> = {
  offen:       { label: "Offen",       color: "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/30"     },
  bestaetigt:  { label: "Bestätigt",   color: "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/30"     },
  ausgezahlt:  { label: "Ausgezahlt",  color: "text-vintage-forest   bg-vintage-forest/10   border-vintage-forest/30"   },
  storniert:   { label: "Storniert",   color: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/30" },
};

const FILTER: Array<{ value: ProvisionStatus | ""; label: string }> = [
  { value: "",           label: "Alle"        },
  { value: "offen",      label: "Offen"       },
  { value: "bestaetigt", label: "Bestätigt"   },
  { value: "ausgezahlt", label: "Ausgezahlt"  },
  { value: "storniert",  label: "Storniert"   },
];

export default async function ProvisionenPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; seite?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/affiliate/anmelden");

  const sp = await searchParams;
  const status = (sp.status as ProvisionStatus | undefined) ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);

  const daten = await provisionenFuerAffiliate({
    affiliate_id: session.user.id,
    status,
    seite,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-cream">Provisionen</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {daten.gesamt} {daten.gesamt === 1 ? "Provision" : "Provisionen"} insgesamt
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand/40 pb-1">
        {FILTER.map(f => (
          <Link
            key={f.value}
            href={f.value ? `/affiliate/provisionen?status=${f.value}` : "/affiliate/provisionen"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value
                ? "bg-vintage-espresso text-vintage-cream"
                : "text-vintage-dust hover:bg-vintage-brown/40 hover:text-vintage-cream/80"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Tabelle */}
      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-brown border border-vintage-sand/40" style={{ borderRadius: "var(--radius-card)" }}>
          <Coins className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-cream/80">Noch keine Provisionen</p>
          <p className="text-vintage-dust text-sm font-sans mt-1">
            Sobald ein Verkauf über deinen Link zustande kommt, erscheint er hier.
          </p>
        </div>
      ) : (
        <div className="bg-vintage-brown border border-vintage-sand/40 overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-brown/40/50 border-b border-vintage-sand/40">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Datum</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Produkt</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Ebene</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Verkaufspreis</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Provision</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(p => {
                  const status = STATUS_LABELS[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-vintage-brown/40/30 transition-colors">
                      <td className="px-4 py-3 text-vintage-dust">
                        {new Date(p.erstellt_am).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-3 text-vintage-cream">{p.produkt_name ?? "–"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-serif text-vintage-gold">L{p.ebene}</span>
                        <span className="text-xs text-vintage-dust ml-1">({p.satz_prozent}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right text-vintage-dust">
                        {formatPreis(p.verkaufspreis_cent / 100)}
                      </td>
                      <td className="px-4 py-3 text-right font-serif text-vintage-cream">
                        {formatPreis(p.betrag_cent / 100)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs font-sans border ${status.color}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
