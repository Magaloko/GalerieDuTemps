import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { kontaktanfragenListe, type KontaktStatus } from "@/lib/db/kontakt";
import { KontaktZeile } from "./kontakt-zeile";
import { Mail, Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Контактные заявки" };
export const dynamic = "force-dynamic";

const STATUS_FILTER: Array<{ value: KontaktStatus | ""; label: string }> = [
  { value: "",            label: "Все"        },
  { value: "neu",         label: "Новая"      },
  { value: "gelesen",     label: "Прочитана"  },
  { value: "beantwortet", label: "Отвечена"   },
  { value: "archiviert",  label: "В архиве"   },
];

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function KontaktAdminPage({ searchParams }: Props) {
  const base = await getModuleBase();
  const sp     = await searchParams;
  const seite  = parseInt(sp.seite ?? "1", 10);
  const status = (sp.status as KontaktStatus | undefined) ?? "";

  const daten = await kontaktanfragenListe({ seite, status });

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Контактные заявки</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            {daten.gesamt} {daten.gesamt === 1 ? "заявка" : "заявок"}
            {status && ` · Фильтр: ${STATUS_FILTER.find(s => s.value === status)?.label}`}
          </p>
        </div>
        <Mail className="w-5 h-5 text-vintage-gold" />
      </div>

      {/* Status-Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {STATUS_FILTER.map(s => (
          <Link
            key={s.value}
            href={s.value ? `${base}/kontakt?status=${s.value}` : `${base}/kontakt`}
            className={`
              px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors
              ${status === s.value
                ? "bg-vintage-espresso text-vintage-cream"
                : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
              }
            `}
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* Liste */}
      {daten.items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center bg-vintage-white border border-vintage-sand"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Inbox className="w-12 h-12 text-vintage-sand mb-4" />
          <p className="font-serif text-vintage-brown text-lg">
            Нет заявок{status && ` со статусом «${STATUS_FILTER.find(s => s.value === status)?.label}»`}
          </p>
          <p className="text-vintage-dust text-sm font-sans mt-1">
            Заявки появятся здесь, когда поступят через контактную форму.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {daten.items.map(a => (
            <KontaktZeile key={a.id} anfrage={a} />
          ))}
        </div>
      )}

      {/* Paginierung */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-vintage-dust font-sans">
            Страница {daten.seite} из {daten.seiten}
          </p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link
                href={`${base}/kontakt?seite=${daten.seite - 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Назад
              </Link>
            )}
            {daten.seite < daten.seiten && (
              <Link
                href={`${base}/kontakt?seite=${daten.seite + 1}${status ? `&status=${status}` : ""}`}
                className="flex items-center gap-1 px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Вперёд <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
