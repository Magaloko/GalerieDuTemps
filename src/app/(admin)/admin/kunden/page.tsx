import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { customersListe } from "@/lib/db/customers";
import { Users, Search, ExternalLink, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import type { CustomerType } from "@/types/commerce";

export const metadata: Metadata = { title: "Клиенты" };
export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<CustomerType, { label: string; klasse: string }> = {
  b2c:           { label: "Частный",      klasse: "chip chip-muted"   },
  b2b_pending:   { label: "B2B ожидает",  klasse: "chip chip-warn"    },
  b2b_verified:  { label: "B2B активен",  klasse: "chip chip-success" },
  b2b_rejected:  { label: "B2B отклонён", klasse: "chip chip-danger"  },
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
        <Users className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
        <div>
          <p className="eyebrow">✦ Клиенты</p>
          <h1 className="list-title">Клиенты</h1>
          <p className="list-sub">Всего клиентов: {daten.gesamt}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="filter-bar">
          {FILTER.map(f => (
            <Link key={f.value}
              href={f.value ? `${base}/kunden?typ=${f.value}` : `${base}/kunden`}
              className={`filter-tab${typ === f.value ? " filter-tab-active" : ""}`}>
              {f.label}
            </Link>
          ))}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="typ" value={typ} />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-ink-mute)" }} />
            <input name="suche" defaultValue={suche} placeholder="E-mail, имя, компания ..."
              className="field-input pl-9" />
          </div>
          <button type="submit" className="btn-coral btn-coral-sm">Найти</button>
        </form>
      </div>

      {daten.items.length === 0 ? (
        <div className="empty-state">
          <Users className="w-10 h-10 opacity-40" />
          <p className="empty-state-title">Клиенты не найдены</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>№ клиента</th>
                  <th>Имя</th>
                  <th>E-mail</th>
                  <th>Компания</th>
                  <th className="center">Тип</th>
                  <th>Создан</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {daten.items.map(c => {
                  const s = TYPE_STYLE[c.customer_type];
                  return (
                    <tr key={c.id}>
                      <td className="mono">KD-{c.customer_number.toString().padStart(4, "0")}</td>
                      <td className="strong">{c.vorname} {c.nachname}</td>
                      <td className="muted">{c.email}</td>
                      <td className="muted">
                        {c.company_name && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {c.company_name}</span>}
                      </td>
                      <td className="center">
                        <span className={s.klasse}>{s.label}</span>
                      </td>
                      <td className="muted">{new Date(c.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td className="num">
                        <Link href={`${base}/kunden/${c.id}`} className="row-action">
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
          <p className="list-sub">Страница {daten.seite} / {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`${base}/kunden?seite=${daten.seite - 1}${typ ? `&typ=${typ}` : ""}`} className="btn-line">
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`${base}/kunden?seite=${daten.seite + 1}${typ ? `&typ=${typ}` : ""}`} className="btn-line">
                Далее <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
