import { adminProvisionenListe } from "@/lib/db/provisionen";
import { formatPreis } from "@/lib/utils/preis";
import Link from "next/link";
import { Coins } from "lucide-react";
import { StornoButton } from "./storno-button";
import type { Metadata } from "next";
import type { ProvisionStatus } from "@/types/affiliate";

export const metadata: Metadata = { title: "Комиссии" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ProvisionStatus, { label: string; klasse: string }> = {
  offen:      { label: "Открыта",     klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  bestaetigt: { label: "Подтверждена", klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  ausgezahlt: { label: "Выплачена",   klasse: "text-vintage-forest   bg-vintage-forest/10"   },
  storniert:  { label: "Сторнирована", klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
};

const FILTER: Array<{ value: ProvisionStatus | ""; label: string }> = [
  { value: "",           label: "Все"          },
  { value: "offen",      label: "Открыта"      },
  { value: "bestaetigt", label: "Подтверждена" },
  { value: "ausgezahlt", label: "Выплачена"    },
  { value: "storniert",  label: "Сторнирована" },
];

export default async function AdminProvisionenPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status as ProvisionStatus | undefined) ?? "";
  const daten = await adminProvisionenListe({ status });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso">Комиссии</h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">{daten.gesamt} комиссий всего</p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `/admin/provisionen?status=${f.value}` : "/admin/provisionen"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}>
            {f.label}
          </Link>
        ))}
      </div>

      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Coins className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-brown">Комиссий пока нет</p>
          <p className="text-vintage-dust text-sm font-sans mt-1">Они создаются, когда контактная заявка отмечена как проданная.</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Дата</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Партнёр</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Товар</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Уровень</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Продажа</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Комиссия</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(p => {
                  const s = STATUS_LABEL[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-vintage-parchment/30 transition-colors">
                      <td className="px-4 py-3 text-vintage-dust">{new Date(p.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3">
                        <p className="text-vintage-ink">{p.affiliate_name}</p>
                        <p className="text-xs text-vintage-dust">{p.affiliate_email}</p>
                      </td>
                      <td className="px-4 py-3 text-vintage-ink">{p.produkt_name ?? "–"}</td>
                      <td className="px-4 py-3 text-center font-serif text-vintage-gold">L{p.ebene}</td>
                      <td className="px-4 py-3 text-right text-vintage-dust">{formatPreis(p.verkaufspreis_cent / 100)}</td>
                      <td className="px-4 py-3 text-right font-serif text-vintage-espresso">{formatPreis(p.betrag_cent / 100)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs ${s.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(p.status === "offen" || p.status === "bestaetigt") && (
                          <StornoButton
                            kontaktanfrageId={p.kontaktanfrage_id}
                            produktName={p.produkt_name}
                          />
                        )}
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
