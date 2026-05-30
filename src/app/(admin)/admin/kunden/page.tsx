import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { customersListe } from "@/lib/db/customers";
import { Users, Search, ExternalLink, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import type { CustomerType } from "@/types/commerce";

export const metadata: Metadata = { title: "Клиенты" };
export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<CustomerType, { label: string; klasse: string }> = {
  b2c:           { label: "Частный",      klasse: "text-vintage-dust     bg-vintage-dust/10" },
  b2b_pending:   { label: "B2B ожидает",  klasse: "text-vintage-gold     bg-vintage-gold/10" },
  b2b_verified:  { label: "B2B активен",  klasse: "text-vintage-sage     bg-vintage-sage/10" },
  b2b_rejected:  { label: "B2B отклонён", klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
};

const FILTER: Array<{ value: CustomerType | ""; label: string }> = [
  { value: "",             label: "Все"         },
  { value: "b2c",          label: "Частные"     },
  { value: "b2b_pending",  label: "B2B ожидает" },
  { value: "b2b_verified", label: "B2B активен" },
];

export default async function KundenAdminPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const base = await getModuleBase();
  const sp    = await searchParams;
  const typ   = (sp.typ as CustomerType | undefined) ?? "";
  const seite = parseInt(sp.seite ?? "1", 10);
  const suche = sp.suche ?? "";
  const daten = await customersListe({ typ, seite, suche });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Клиенты</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">Всего клиентов: {daten.gesamt}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
          {FILTER.map(f => (
            <Link key={f.value}
              href={f.value ? `${base}/kunden?typ=${f.value}` : `${base}/kunden`}
              className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
                typ === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
              }`}
              style={{ borderRadius: "var(--radius-button)" }}>
              {f.label}
            </Link>
          ))}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="typ" value={typ} />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-dust pointer-events-none" />
            <input name="suche" defaultValue={suche} placeholder="E-mail, имя, компания ..."
              className="w-full pl-9 pr-4 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }} />
          </div>
          <button type="submit" className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
            Найти
          </button>
        </form>
      </div>

      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Users className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-vintage-brown">Клиенты не найдены</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">№ клиента</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Имя</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">E-mail</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Компания</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Тип</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Создан</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(c => {
                  const s = TYPE_STYLE[c.customer_type];
                  return (
                    <tr key={c.id} className="hover:bg-vintage-parchment/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-vintage-gold text-xs">KD-{c.customer_number.toString().padStart(4, "0")}</td>
                      <td className="px-4 py-3 text-vintage-ink">{c.vorname} {c.nachname}</td>
                      <td className="px-4 py-3 text-vintage-dust">{c.email}</td>
                      <td className="px-4 py-3 text-vintage-brown text-xs">
                        {c.company_name && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {c.company_name}</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs ${s.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-vintage-dust text-xs">{new Date(c.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`${base}/kunden/${c.id}`} className="text-vintage-dust hover:text-vintage-brown p-1.5 inline-block" style={{ borderRadius: "var(--radius-vintage)" }}>
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
          <p className="text-xs text-vintage-dust font-sans">Страница {daten.seite} / {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`${base}/kunden?seite=${daten.seite - 1}${typ ? `&typ=${typ}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`${base}/kunden?seite=${daten.seite + 1}${typ ? `&typ=${typ}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                Далее <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
