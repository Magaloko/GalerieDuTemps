import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { leadsListe, leadKpis, type LeadQuelle, type LeadStatus } from "@/lib/db/leads";
import { auth } from "@/lib/auth/config";
import {
  Inbox, Mail, Camera, Send, MessageCircle, AlertTriangle,
  Clock, CheckCircle2, User as UserIcon, Search, ChevronRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Входящие" };
export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<Record<string, string>> }

const QUELLE_META: Record<LeadQuelle, { label: string; icon: React.ElementType; klasse: string }> = {
  kontaktanfrage:     { label: "Контакт",      icon: Mail,          klasse: "text-vintage-brown" },
  instagram_dm:       { label: "IG · DM",      icon: Camera,        klasse: "text-vintage-burgundy" },
  instagram_comment:  { label: "IG · комментарий", icon: Camera,    klasse: "text-vintage-burgundy" },
  instagram_mention:  { label: "IG · упоминание",  icon: Camera,    klasse: "text-vintage-burgundy" },
  telegram:           { label: "Telegram",     icon: Send,          klasse: "text-vintage-sage" },
  whatsapp:           { label: "WhatsApp",     icon: MessageCircle, klasse: "text-vintage-sage" },
  mail:               { label: "Почта",        icon: Mail,          klasse: "text-vintage-brown" },
  manuell:            { label: "Вручную",      icon: UserIcon,      klasse: "text-vintage-dust" },
};

const STATUS_META: Record<LeadStatus, { label: string; klasse: string }> = {
  neu:           { label: "Новый",          klasse: "chip chip-warn"    },
  gelesen:       { label: "Прочитан",       klasse: "chip chip-muted"   },
  in_arbeit:     { label: "В работе",       klasse: "chip chip-coral"   },
  beantwortet:   { label: "Отвечен",        klasse: "chip chip-success" },
  qualifiziert:  { label: "Квалифицирован", klasse: "chip chip-success" },
  verloren:      { label: "Потерян",        klasse: "chip chip-danger"  },
  archiviert:    { label: "В архиве",       klasse: "chip chip-muted"   },
};

export default async function InboxPage({ searchParams }: Props) {
  const base = await getModuleBase();
  const sp      = await searchParams;
  const session = await auth();
  const userId  = session?.user?.id;

  const seite       = parseInt(sp.seite ?? "1", 10);
  const status      = (sp.status ?? "alle") as LeadStatus | "alle" | "offen";
  const quelle      = (sp.quelle ?? "alle") as LeadQuelle | "alle";
  const nurMeine    = sp.meine === "1";
  const suche       = sp.suche ?? "";

  const [daten, kpis] = await Promise.all([
    leadsListe({
      seite,
      status: status === "alle" ? undefined : status,
      quelle: quelle === "alle" ? undefined : quelle,
      meine_user_id: nurMeine ? userId : undefined,
      suche,
    }),
    leadKpis(userId),
  ]);

  const link = (overrides: Record<string,string|undefined>) => {
    const merged = { ...{ seite: String(seite), status, quelle, meine: nurMeine ? "1" : "", suche }, ...overrides };
    const qs = new URLSearchParams(Object.entries(merged).filter(([,v])=>v && v !== "alle") as [string,string][]);
    return `/admin/leads?${qs}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow">✦ Входящие</p>
          <h1 className="list-title flex items-center gap-2">
            <Inbox className="w-5 h-5" style={{ color: "var(--color-coral)" }} /> Входящие
          </h1>
          <p className="list-sub">Все входящие сообщения · форма, Instagram, Telegram</p>
        </div>
        <Link
          href={link({ meine: nurMeine ? "" : "1", seite: "1" })}
          className={nurMeine ? "btn-coral btn-coral-sm" : "btn-line"}
        >
          {nurMeine ? "Все лиды" : "Только мои"}
        </Link>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Всего",        value: kpis.alle,      accent: false, icon: undefined as React.ElementType | undefined },
          { label: "Новые",        value: kpis.neu,       accent: true,  icon: AlertTriangle },
          { label: "В работе",     value: kpis.in_arbeit, accent: false, icon: Clock         },
          { label: "Срочно",       value: kpis.dringend,  accent: true,  icon: AlertTriangle },
          { label: "Мои открытые", value: kpis.meine,     accent: false, icon: UserIcon      },
        ].map(c => (
          <div key={c.label} className={`kpi${c.accent ? " kpi-accent" : ""}`}>
            <p className="kpi-label">
              {c.icon && <c.icon className="w-3.5 h-3.5" />} {c.label}
            </p>
            <p className="kpi-value">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter: Kanal + Status + Suche */}
      <div className="surface p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow eyebrow-mute mr-1">Канал:</span>
          {(["alle","kontaktanfrage","instagram_dm","telegram"] as const).map(q => (
            <Link key={q} href={link({ quelle: q, seite: "1" })}
                  className={`filter-tab${quelle === q ? " filter-tab-active" : ""}`}>
              {q === "alle" ? "Все" : QUELLE_META[q].label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow eyebrow-mute mr-1">Статус:</span>
          {(["alle","neu","in_arbeit","beantwortet","archiviert"] as const).map(s => (
            <Link key={s} href={link({ status: s, seite: "1" })}
                  className={`filter-tab${status === s ? " filter-tab-active" : ""}`}>
              {s === "alle" ? "Все" : STATUS_META[s].label}
            </Link>
          ))}
        </div>
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="quelle" value={quelle} />
          <input type="hidden" name="status" value={status} />
          {nurMeine && <input type="hidden" name="meine" value="1" />}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-ink-mute)" }} />
            <input name="suche" defaultValue={suche}
                   placeholder="Поиск по имени, e-mail, теме …"
                   className="field-input pl-9" />
          </div>
          <button type="submit" className="btn-coral btn-coral-sm">Найти</button>
        </form>
      </div>

      {/* Tabelle */}
      {daten.items.length === 0 ? (
        <div className="empty-state">
          <Inbox className="w-12 h-12 opacity-40" />
          <p className="empty-state-title">Входящие пусты</p>
          <p className="text-xs mt-1">
            {suche ? `Нет результатов для «${suche}»` : "Пока нет обращений"}
          </p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-32">Канал</th>
                  <th>Контакт</th>
                  <th className="hidden md:table-cell">Сообщение</th>
                  <th className="w-32 hidden lg:table-cell">Назначено</th>
                  <th className="center w-28">Статус</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {daten.items.map(l => {
                  const q = QUELLE_META[l.quelle];
                  const Icon = q.icon;
                  const stat = STATUS_META[l.status];
                  return (
                    <tr key={l.id}>
                      <td>
                        <div className={`flex items-center gap-1.5 text-xs ${q.klasse}`}>
                          <Icon className="w-3.5 h-3.5" /> {q.label}
                        </div>
                        <p className="muted mt-1">{new Date(l.erstellt_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>
                      </td>
                      <td>
                        <p className="strong">{l.kontakt_name ?? l.kontakt_handle ?? "—"}</p>
                        {l.kontakt_email && <p className="muted truncate max-w-48">{l.kontakt_email}</p>}
                      </td>
                      <td className="hidden md:table-cell">
                        <p className="strong truncate max-w-md">{l.betreff || l.vorschau || "—"}</p>
                        {l.produkt_name && <p className="truncate max-w-md" style={{ color: "var(--color-coral-deep)", fontSize: "0.75rem" }}>↳ {l.produkt_name}</p>}
                      </td>
                      <td className="muted hidden lg:table-cell">
                        {l.zugewiesen_an_name ?? "—"}
                      </td>
                      <td className="center">
                        <span className={stat.klasse}>{stat.label}</span>
                      </td>
                      <td className="num">
                        <Link href={`${base}/leads/${l.id}`} className="row-action" title="Открыть">
                          <ChevronRight className="w-4 h-4" />
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

      {/* Pagination */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between">
          <p className="list-sub">
            Страница {daten.seite} из {daten.seiten} · {daten.gesamt} всего
          </p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={link({ seite: String(daten.seite - 1) })} className="btn-line">← Назад</Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={link({ seite: String(daten.seite + 1) })} className="btn-line">Вперёд →</Link>
            )}
          </div>
        </div>
      )}

      <p className="list-sub">
        <CheckCircle2 className="w-3 h-3 inline mr-1" />
        Instagram и Telegram будут подключены во 2/3 сессии — интерфейс входящих уже готов.
      </p>
    </div>
  );
}
