import Link from "next/link";
import { ordersListe } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { Package, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

export const metadata: Metadata = { title: "Bestellungen" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<OrderStatus, { label: string; klasse: string }> = {
  pending:   { label: "Wartet",      klasse: "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/30"     },
  paid:      { label: "Bezahlt",     klasse: "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/30"     },
  fulfilled: { label: "Versandt",    klasse: "text-vintage-forest   bg-vintage-forest/10   border-vintage-forest/30"   },
  completed: { label: "Abgeschlossen", klasse: "text-vintage-forest bg-vintage-forest/10   border-vintage-forest/30"   },
  cancelled: { label: "Storniert",   klasse: "text-vintage-dust     bg-vintage-dust/10     border-vintage-dust/30"     },
  refunded:  { label: "Erstattet",   klasse: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/30" },
};

const FILTER: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "",          label: "Alle"          },
  { value: "pending",   label: "Wartet"        },
  { value: "paid",      label: "Bezahlt"       },
  { value: "fulfilled", label: "Versandt"      },
  { value: "completed", label: "Abgeschlossen" },
  { value: "cancelled", label: "Storniert"     },
];

export default async function BestellungenAdminPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const status = (sp.status as OrderStatus | undefined) ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);
  const suche  = sp.suche ?? "";

  const daten = await ordersListe({ status, seite, suche });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Bestellungen</h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          {daten.gesamt} {daten.gesamt === 1 ? "Bestellung" : "Bestellungen"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => (
          <Link
            key={f.value}
            href={f.value ? `/admin/bestellungen?status=${f.value}` : "/admin/bestellungen"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Package className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-brown">Keine Bestellungen</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Nr.</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Datum</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Kunde</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Summe</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(o => {
                  const s = STATUS_STYLE[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-vintage-parchment/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-vintage-gold">GDT-{o.order_number}</td>
                      <td className="px-4 py-3 text-vintage-dust">{new Date(o.erstellt_am).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-3 text-vintage-ink">
                        <p className="truncate max-w-48">{o.customer_name ?? "Gast"}</p>
                        <p className="text-xs text-vintage-dust truncate max-w-48">{o.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-serif text-vintage-espresso">{formatPreis(o.total_cents / 100)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs border ${s.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/bestellungen/${o.id}`} className="text-vintage-dust hover:text-vintage-brown p-1.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {daten.seiten > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-vintage-dust font-sans">Seite {daten.seite} von {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`/admin/bestellungen?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Zurück
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`/admin/bestellungen?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                Weiter <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
