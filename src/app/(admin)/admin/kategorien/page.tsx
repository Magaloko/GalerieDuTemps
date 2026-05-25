import Link from "next/link";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Tag, CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kategorien" };
export const dynamic = "force-dynamic";

export default async function KategorienListePage() {
  const kategorien = await alleKategorienAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Kategorien</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            {kategorien.length} {kategorien.length === 1 ? "Kategorie" : "Kategorien"} gesamt
          </p>
        </div>
        <Link href="/admin/kategorien/neu">
          <Button icon={<Plus className="w-3.5 h-3.5" />}>Neue Kategorie</Button>
        </Link>
      </div>

      <div
        className="bg-vintage-white border border-vintage-sand overflow-hidden"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        {kategorien.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tag className="w-12 h-12 text-vintage-sand mb-3" />
            <p className="font-serif text-vintage-brown text-lg">Keine Kategorien</p>
            <Link href="/admin/kategorien/neu">
              <Button className="mt-4" size="sm" icon={<Plus className="w-3 h-3" />}>
                Erste Kategorie erstellen
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-vintage-sand bg-vintage-parchment/50 text-xs uppercase tracking-widest text-vintage-dust">
                  <th className="text-left px-4 py-3 font-normal w-16">Code</th>
                  <th className="text-left px-4 py-3 font-normal">Name</th>
                  <th className="text-left px-4 py-3 font-normal hidden md:table-cell">Eltern</th>
                  <th className="text-right px-4 py-3 font-normal w-20">Sort.</th>
                  <th className="text-right px-4 py-3 font-normal w-20">Produkte</th>
                  <th className="text-center px-4 py-3 font-normal w-24">Status</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {kategorien.map(k => (
                  <tr key={k.id} className="hover:bg-vintage-parchment/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-vintage-dust">
                        {k.code ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-vintage-ink">{k.name}</p>
                      <p className="text-xs text-vintage-dust font-mono">{k.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-vintage-dust hidden md:table-cell">
                      {k.eltern_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-vintage-dust">{k.sortierung}</td>
                    <td className="px-4 py-3 text-right text-vintage-brown">
                      {k.anzahl ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {k.aktiv ? (
                        <span className="inline-flex items-center gap-1 text-vintage-sage text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-vintage-dust text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Inaktiv
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/kategorien/${k.id}`}
                        className="inline-flex p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                        style={{ borderRadius: "var(--radius-vintage)" }}
                        title="Bearbeiten"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
