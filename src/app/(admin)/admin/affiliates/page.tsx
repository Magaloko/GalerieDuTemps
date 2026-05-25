import Link from "next/link";
import { affiliatesListe } from "@/lib/db/affiliates";
import { AffiliateZeile } from "./affiliate-zeile";
import { Users, Search, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import type { Metadata } from "next";
import type { AffiliateStatus } from "@/types/affiliate";

export const metadata: Metadata = { title: "Affiliates" };
export const dynamic = "force-dynamic";

const STATUS_FILTER: Array<{ value: AffiliateStatus | ""; label: string }> = [
  { value: "",         label: "Alle"     },
  { value: "pending",  label: "Warten"   },
  { value: "aktiv",    label: "Aktiv"    },
  { value: "gesperrt", label: "Gesperrt" },
];

export default async function AffiliatesAdminPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const sp     = await searchParams;
  const status = (sp.status as AffiliateStatus | undefined) ?? "";
  const suche  = sp.suche ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);

  const daten = await affiliatesListe({ status, suche, seite });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Affiliates</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            {daten.gesamt} {daten.gesamt === 1 ? "Partner" : "Partner"}{status && ` · ${STATUS_FILTER.find(s => s.value === status)?.label}`}
          </p>
        </div>
        <Link href="/admin/affiliates/einstellungen"
          className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}>
          <Settings className="w-3.5 h-3.5" /> Einstellungen
        </Link>
      </div>

      {/* Filter + Suche */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
          {STATUS_FILTER.map(s => (
            <Link
              key={s.value}
              href={s.value ? `/admin/affiliates?status=${s.value}` : "/admin/affiliates"}
              className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
                status === s.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
              }`}
              style={{ borderRadius: "var(--radius-button)" }}
            >
              {s.label}
            </Link>
          ))}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-dust pointer-events-none" />
            <input
              name="suche"
              defaultValue={suche}
              placeholder="E-Mail, Name oder Code …"
              className="w-full pl-9 pr-4 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
            Suchen
          </button>
        </form>
      </div>

      {/* Liste */}
      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Users className="w-12 h-12 text-vintage-sand mb-4" />
          <p className="font-serif text-lg text-vintage-brown">Keine Affiliates gefunden</p>
          <p className="text-vintage-dust text-sm font-sans mt-1">
            {suche ? "Suchbegriff anpassen" : "Neue Anmeldungen erscheinen hier"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {daten.items.map(a => <AffiliateZeile key={a.id} affiliate={a} />)}
        </div>
      )}

      {/* Paginierung */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-vintage-dust font-sans">Seite {daten.seite} von {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`/admin/affiliates?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Zurück
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`/admin/affiliates?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`}
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
