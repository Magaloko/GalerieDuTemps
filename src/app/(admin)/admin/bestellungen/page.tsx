import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { ordersListe } from "@/lib/db/orders";
import { query } from "@/lib/db";
import { formatPreis } from "@/lib/utils/preis";
import { Package, ChevronLeft, ChevronRight, ExternalLink, Clock, CreditCard, Truck, Plus } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";
import { StatusChipSelect } from "./status-chip-select";
import { PeekButton } from "./peek-button";

interface StatusCounts {
  pending:   number;
  paid:      number;
  fulfilled: number;
  completed: number;
  cancelled: number;
  refunded:  number;
  gesamt:    number;
  heute_verschickt: number;
}

async function statusCounts(): Promise<StatusCounts> {
  const res = await query<{ status: OrderStatus; anzahl: number }>(
    `SELECT status, COUNT(*)::int AS anzahl
     FROM sebo.orders
     GROUP BY status`
  );
  const heute = await query<{ anzahl: number }>(
    `SELECT COUNT(*)::int AS anzahl FROM sebo.orders
     WHERE versendet_am::date = CURRENT_DATE`
  );

  const counts: StatusCounts = {
    pending: 0, paid: 0, fulfilled: 0, completed: 0, cancelled: 0, refunded: 0,
    gesamt: 0, heute_verschickt: heute.rows[0]?.anzahl ?? 0,
  };
  for (const r of res.rows) {
    counts[r.status] = r.anzahl;
    counts.gesamt   += r.anzahl;
  }
  return counts;
}

const formatBestellnummer = (n: number) => `GDT-${String(n).padStart(4, "0")}`;

export const metadata: Metadata = { title: "Заказы" };
export const dynamic = "force-dynamic";

const FILTER: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "",          label: "Все"       },
  { value: "pending",   label: "Ожидает"   },
  { value: "paid",      label: "Оплачен"   },
  { value: "fulfilled", label: "Отправлен" },
  { value: "completed", label: "Завершён"  },
  { value: "cancelled", label: "Отменён"   },
];

export default async function BestellungenAdminPage({
  searchParams,
}: { searchParams: Promise<Record<string, string>> }) {
  const base = await getModuleBase();
  const sp = await searchParams;
  const status = (sp.status as OrderStatus | undefined) ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);
  const suche  = sp.suche ?? "";

  const [daten, counts] = await Promise.all([
    ordersListe({ status, seite, suche }),
    statusCounts(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">✦ Заказы</p>
          <h1 className="list-title">Заказы</h1>
          <p className="list-sub">Всего заказов: {counts.gesamt}</p>
        </div>
        <Link href={`${base}/bestellungen/neu`} className="btn-coral btn-coral-sm">
          <Plus className="w-3.5 h-3.5" /> Ручной заказ
        </Link>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi">
          <p className="kpi-label"><Package className="w-3.5 h-3.5" /> Все</p>
          <p className="kpi-value">{counts.gesamt}</p>
        </div>
        <div className="kpi kpi-accent">
          <p className="kpi-label"><Clock className="w-3.5 h-3.5" /> Ожидает оплаты</p>
          <p className="kpi-value">{counts.pending}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label"><CreditCard className="w-3.5 h-3.5" /> В обработке</p>
          <p className="kpi-value">{counts.paid + counts.fulfilled}</p>
        </div>
        <div className="kpi">
          <p className="kpi-label"><Truck className="w-3.5 h-3.5" /> Отправлено сегодня</p>
          <p className="kpi-value">{counts.heute_verschickt}</p>
        </div>
      </div>

      <div className="filter-bar">
        {FILTER.map(f => {
          const count = f.value === ""
            ? counts.gesamt
            : counts[f.value as keyof StatusCounts] as number;
          return (
            <Link
              key={f.value}
              href={f.value ? `${base}/bestellungen?status=${f.value}` : `${base}/bestellungen`}
              className={`filter-tab${status === f.value ? " filter-tab-active" : ""}`}
            >
              {f.label} <span className="filter-tab-count">{count}</span>
            </Link>
          );
        })}
      </div>

      {daten.items.length === 0 ? (
        <div className="empty-state">
          <Package className="w-10 h-10 opacity-40" />
          <p className="empty-state-title">Заказов нет</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th className="num">Сумма</th>
                  <th className="center">Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {daten.items.map(o => {
                  return (
                    <tr key={o.id}>
                      <td className="mono">{formatBestellnummer(o.order_number)}</td>
                      <td className="muted">{new Date(o.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td>
                        <p className="strong truncate max-w-48">{o.customer_name ?? "Гость"}</p>
                        <p className="muted truncate max-w-48">{o.customer_email}</p>
                      </td>
                      <td className="num strong">{formatPreis(o.total_cents / 100)}</td>
                      <td className="center">
                        <StatusChipSelect orderId={o.id} initial={o.status} />
                      </td>
                      <td className="num">
                        <div className="flex items-center justify-end gap-0.5">
                          <PeekButton orderId={o.id} />
                          <Link href={`${base}/bestellungen/${o.id}`} className="row-action" title="Открыть полностью">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
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
          <p className="list-sub">Страница {daten.seite} из {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`${base}/bestellungen?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`} className="btn-line">
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`${base}/bestellungen?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`} className="btn-line">
                Далее <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
