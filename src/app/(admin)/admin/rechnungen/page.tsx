import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { alleRechnungen } from "@/lib/db/invoices";
import { formatPreis } from "@/lib/utils/preis";
import { FileText, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Счета" };
export const dynamic = "force-dynamic";

const FILTER = [
  { value: "",          label: "Все" },
  { value: "offen",     label: "Открыт" },
  { value: "bezahlt",   label: "Оплачен" },
  { value: "storniert", label: "Сторнирован" },
];

const STATUS_KLASSE: Record<string, string> = {
  offen:      "chip chip-warn",
  bezahlt:    "chip chip-success",
  storniert:  "chip chip-danger",
  gutschrift: "chip chip-coral",
};

export default async function RechnungenPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; seite?: string }> }) {
  const base   = await getModuleBase();
  const sp     = await searchParams;
  const status = sp.status ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);
  const daten  = await alleRechnungen({ status, seite });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
        <div>
          <p className="eyebrow">✦ Счета</p>
          <h1 className="list-title">Счета</h1>
          <p className="list-sub">{daten.gesamt} счетов</p>
        </div>
      </div>

      <div className="filter-bar">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `${base}/rechnungen?status=${f.value}` : `${base}/rechnungen`}
            className={`filter-tab${status === f.value ? " filter-tab-active" : ""}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {daten.items.length === 0 ? (
        <div className="empty-state">
          <FileText className="w-10 h-10 opacity-40" />
          <p className="empty-state-title">Счетов пока нет</p>
          <p className="text-xs mt-1">Они создаются после оплаты заказов.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>№ документа</th>
                  <th>Дата</th>
                  <th>Получатель</th>
                  <th>Заказ</th>
                  <th className="num">Brutto</th>
                  <th className="center">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {daten.items.map(r => (
                  <tr key={r.id}>
                    <td className="mono">RG-{r.invoice_number.toString().padStart(4, "0")}</td>
                    <td className="muted">{new Date(r.rechnungs_datum).toLocaleDateString("ru-RU")}</td>
                    <td className="truncate max-w-48">
                      <p className="strong">{r.empfaenger_name}</p>
                      <p className="muted">{r.empfaenger_email}</p>
                    </td>
                    <td>
                      <Link href={`${base}/bestellungen/${r.order_id}`} className="mono">
                        GDT-{r.order_number}
                      </Link>
                    </td>
                    <td className="num strong">{formatPreis(r.brutto_cents / 100)}</td>
                    <td className="center">
                      <span className={STATUS_KLASSE[r.status]}>{r.status}</span>
                    </td>
                    <td className="num">
                      <a href={`/rechnung/${r.order_id}`} target="_blank" className="row-action">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {daten.seiten > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="list-sub">Страница {daten.seite} из {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`${base}/rechnungen?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`} className="btn-line">
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`${base}/rechnungen?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`} className="btn-line">
                Вперёд <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
