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
  offen:      { label: "Открыта",      klasse: "chip chip-warn"    },
  bestaetigt: { label: "Подтверждена", klasse: "chip chip-success" },
  ausgezahlt: { label: "Выплачена",    klasse: "chip chip-success" },
  storniert:  { label: "Сторнирована", klasse: "chip chip-danger"  },
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
        <p className="eyebrow">✦ Комиссии</p>
        <h1 className="list-title">Комиссии</h1>
        <p className="list-sub">{daten.gesamt} комиссий всего</p>
      </div>

      <div className="filter-bar">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `/admin/provisionen?status=${f.value}` : "/admin/provisionen"}
            className={`filter-tab${status === f.value ? " filter-tab-active" : ""}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {daten.items.length === 0 ? (
        <div className="empty-state">
          <Coins className="w-10 h-10 opacity-40" />
          <p className="empty-state-title">Комиссий пока нет</p>
          <p className="text-sm mt-1">Они создаются, когда контактная заявка отмечена как проданная.</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Партнёр</th>
                  <th>Товар</th>
                  <th className="center">Уровень</th>
                  <th className="num">Продажа</th>
                  <th className="num">Комиссия</th>
                  <th className="center">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {daten.items.map(p => {
                  const s = STATUS_LABEL[p.status];
                  return (
                    <tr key={p.id}>
                      <td className="muted">{new Date(p.erstellt_am).toLocaleDateString("ru-RU")}</td>
                      <td>
                        <p className="strong">{p.affiliate_name}</p>
                        <p className="muted">{p.affiliate_email}</p>
                      </td>
                      <td className="strong">{p.produkt_name ?? "–"}</td>
                      <td className="center" style={{ color: "var(--color-coral-deep)", fontFamily: "var(--font-serif)" }}>L{p.ebene}</td>
                      <td className="num muted">{formatPreis(p.verkaufspreis_cent / 100)}</td>
                      <td className="num strong">{formatPreis(p.betrag_cent / 100)}</td>
                      <td className="center">
                        <span className={s.klasse}>{s.label}</span>
                      </td>
                      <td>
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
