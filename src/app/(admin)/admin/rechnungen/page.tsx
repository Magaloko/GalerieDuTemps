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
  offen:      "text-vintage-gold     bg-vintage-gold/10",
  bezahlt:    "text-vintage-sage     bg-vintage-sage/10",
  storniert:  "text-vintage-burgundy bg-vintage-burgundy/10",
  gutschrift: "text-vintage-copper   bg-vintage-copper/10",
};

export default async function RechnungenPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; seite?: string }> }) {
  const sp     = await searchParams;
  const status = sp.status ?? "";
  const seite  = parseInt(sp.seite ?? "1", 10);
  const daten  = await alleRechnungen({ status, seite });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Счета</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{daten.gesamt} счетов</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `/admin/rechnungen?status=${f.value}` : "/admin/rechnungen"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}>
            {f.label}
          </Link>
        ))}
      </div>

      {daten.items.length === 0 ? (
        <div className="text-center py-16 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <FileText className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Счетов пока нет</p>
          <p className="text-xs text-vintage-dust font-sans mt-1">Они создаются после оплаты заказов.</p>
        </div>
      ) : (
        <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-vintage-parchment/50 border-b border-vintage-sand">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">№ документа</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Дата</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Получатель</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Заказ</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Brutto</th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-vintage-dust font-normal">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(r => (
                  <tr key={r.id} className="hover:bg-vintage-parchment/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-vintage-gold">RG-{r.invoice_number.toString().padStart(4, "0")}</td>
                    <td className="px-4 py-3 text-vintage-dust">{new Date(r.rechnungs_datum).toLocaleDateString("ru-RU")}</td>
                    <td className="px-4 py-3 text-vintage-ink truncate max-w-48">
                      <p>{r.empfaenger_name}</p>
                      <p className="text-xs text-vintage-dust">{r.empfaenger_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bestellungen/${r.order_id}`} className="font-mono text-vintage-brown hover:text-vintage-espresso transition-colors">
                        GDT-{r.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-serif text-vintage-espresso">{formatPreis(r.brutto_cents / 100)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs ${STATUS_KLASSE[r.status]}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/rechnung/${r.order_id}`} target="_blank" className="text-vintage-dust hover:text-vintage-brown p-1.5 inline-block" style={{ borderRadius: "var(--radius-vintage)" }}>
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
          <p className="text-xs text-vintage-dust font-sans">Страница {daten.seite} из {daten.seiten}</p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={`/admin/rechnungen?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={`/admin/rechnungen?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}>
                Вперёд <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
