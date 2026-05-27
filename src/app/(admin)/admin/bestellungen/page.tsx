import Link from "next/link";
import { ordersListe } from "@/lib/db/orders";
import { query } from "@/lib/db";
import { formatPreis } from "@/lib/utils/preis";
import { Package, ChevronLeft, ChevronRight, ExternalLink, Clock, CreditCard, Truck, Plus } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";

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

const STATUS_STYLE: Record<OrderStatus, { label: string; klasse: string }> = {
  pending:   { label: "Ожидает",   klasse: "text-vintage-gold     bg-vintage-gold/10     border-vintage-gold/30"     },
  paid:      { label: "Оплачен",   klasse: "text-vintage-sage     bg-vintage-sage/10     border-vintage-sage/30"     },
  fulfilled: { label: "Отправлен", klasse: "text-vintage-forest   bg-vintage-forest/10   border-vintage-forest/30"   },
  completed: { label: "Завершён",  klasse: "text-vintage-forest bg-vintage-forest/10   border-vintage-forest/30"   },
  cancelled: { label: "Отменён",   klasse: "text-vintage-dust     bg-vintage-dust/10     border-vintage-dust/30"     },
  refunded:  { label: "Возврат",   klasse: "text-vintage-burgundy bg-vintage-burgundy/10 border-vintage-burgundy/30" },
};

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
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Заказы</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Всего заказов: {counts.gesamt}
          </p>
        </div>
        <Link
          href="/admin/bestellungen/neu"
          className="flex items-center gap-2 px-4 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-[0.2em] uppercase hover:bg-vintage-brown transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Ручной заказ
        </Link>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-vintage-white border border-vintage-sand p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" /> Все
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{counts.gesamt}</p>
        </div>
        <div className="bg-vintage-gold/10 border border-vintage-gold/30 p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-brown flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Ожидает оплаты
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{counts.pending}</p>
        </div>
        <div className="bg-vintage-sage/10 border border-vintage-sage/30 p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-forest flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> В обработке
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{counts.paid + counts.fulfilled}</p>
        </div>
        <div className="bg-vintage-white border border-vintage-sand p-4" style={{ borderRadius: "var(--radius-card)" }}>
          <p className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Отправлено сегодня
          </p>
          <p className="font-serif text-2xl text-vintage-espresso mt-1">{counts.heute_verschickt}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => {
          const count = f.value === ""
            ? counts.gesamt
            : counts[f.value as keyof StatusCounts] as number;
          return (
            <Link
              key={f.value}
              href={f.value ? `/admin/bestellungen?status=${f.value}` : "/admin/bestellungen"}
              className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
                status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
              }`}
              style={{ borderRadius: "var(--radius-button)" }}
            >
              {f.label} <span className="opacity-60">{count}</span>
            </Link>
          );
        })}
      </div>

      {daten.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Package className="w-10 h-10 text-vintage-sand mb-3" />
          <p className="font-serif text-lg text-vintage-brown">Заказов нет</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">№</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Дата</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Клиент</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Сумма</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(o => {
                  const s = STATUS_STYLE[o.status];
                  return (
                    <tr key={o.id} className="hover:bg-vintage-parchment/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-vintage-gold">{formatBestellnummer(o.order_number)}</td>
                      <td className="px-4 py-3 text-vintage-dust">{new Date(o.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td className="px-4 py-3 text-vintage-ink">
                        <p className="truncate max-w-48">{o.customer_name ?? "Гость"}</p>
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
          <p className="text-xs text-vintage-dust font-sans">Страница {daten.seite} из {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`/admin/bestellungen?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`/admin/bestellungen?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`}
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
