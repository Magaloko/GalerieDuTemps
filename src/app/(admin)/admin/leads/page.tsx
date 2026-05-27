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
  neu:           { label: "Новый",          klasse: "bg-vintage-gold/10 text-vintage-gold border-vintage-gold/40" },
  gelesen:       { label: "Прочитан",       klasse: "bg-vintage-parchment text-vintage-brown border-vintage-sand" },
  in_arbeit:     { label: "В работе",       klasse: "bg-vintage-copper/10 text-vintage-copper border-vintage-copper/40" },
  beantwortet:   { label: "Отвечен",        klasse: "bg-vintage-sage/10 text-vintage-forest border-vintage-sage/40" },
  qualifiziert:  { label: "Квалифицирован", klasse: "bg-vintage-sage/10 text-vintage-forest border-vintage-sage/40" },
  verloren:      { label: "Потерян",        klasse: "bg-vintage-burgundy/10 text-vintage-burgundy border-vintage-burgundy/40" },
  archiviert:    { label: "В архиве",       klasse: "bg-vintage-dust/10 text-vintage-dust border-vintage-dust/40" },
};

export default async function InboxPage({ searchParams }: Props) {
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
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
            <Inbox className="w-5 h-5 text-vintage-gold" /> Входящие
          </h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Все входящие сообщения · форма, Instagram, Telegram
          </p>
        </div>
        <Link
          href={link({ meine: nurMeine ? "" : "1", seite: "1" })}
          className={`px-4 py-2 text-xs font-sans tracking-widest uppercase border transition-colors ${
            nurMeine ? "bg-vintage-gold text-vintage-espresso border-vintage-gold" : "border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
          }`}
          style={{ borderRadius: "var(--radius-button)" }}
        >
          {nurMeine ? "Все лиды" : "Только мои"}
        </Link>
      </div>

      {/* KPI-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Всего",       value: kpis.alle,        klasse: "bg-vintage-white border-vintage-sand"            },
          { label: "Новые",       value: kpis.neu,         klasse: "bg-vintage-gold/10 border-vintage-gold/30"       , icon: AlertTriangle },
          { label: "В работе",    value: kpis.in_arbeit,   klasse: "bg-vintage-copper/10 border-vintage-copper/30"   , icon: Clock         },
          { label: "Срочно",      value: kpis.dringend,    klasse: "bg-vintage-burgundy/10 border-vintage-burgundy/30", icon: AlertTriangle },
          { label: "Мои открытые", value: kpis.meine,      klasse: "bg-vintage-sage/10 border-vintage-sage/30"       , icon: UserIcon      },
        ].map(c => (
          <div key={c.label} className={`p-4 border ${c.klasse}`} style={{ borderRadius: "var(--radius-card)" }}>
            <p className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
              {c.icon && <c.icon className="w-3.5 h-3.5" />} {c.label}
            </p>
            <p className="font-serif text-2xl text-vintage-espresso mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter: Kanal + Status + Suche */}
      <div className="bg-vintage-white border border-vintage-sand p-4 space-y-3"
           style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-sans uppercase tracking-widest text-vintage-dust mr-1">Канал:</span>
          {(["alle","kontaktanfrage","instagram_dm","telegram"] as const).map(q => (
            <Link key={q} href={link({ quelle: q, seite: "1" })}
                  className={`px-3 py-1 text-xs font-sans border transition-colors ${
                    quelle === q ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso"
                                  : "border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
                  }`}
                  style={{ borderRadius: "var(--radius-vintage)" }}>
              {q === "alle" ? "Все" : QUELLE_META[q].label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-sans uppercase tracking-widest text-vintage-dust mr-1">Статус:</span>
          {(["alle","neu","in_arbeit","beantwortet","archiviert"] as const).map(s => (
            <Link key={s} href={link({ status: s, seite: "1" })}
                  className={`px-3 py-1 text-xs font-sans border transition-colors ${
                    status === s ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso"
                                  : "border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
                  }`}
                  style={{ borderRadius: "var(--radius-vintage)" }}>
              {s === "alle" ? "Все" : STATUS_META[s].label}
            </Link>
          ))}
        </div>
        <form method="GET" className="flex gap-2">
          <input type="hidden" name="quelle" value={quelle} />
          <input type="hidden" name="status" value={status} />
          {nurMeine && <input type="hidden" name="meine" value="1" />}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vintage-dust pointer-events-none" />
            <input name="suche" defaultValue={suche}
                   placeholder="Поиск по имени, e-mail, теме …"
                   className="w-full pl-9 pr-4 py-2 bg-vintage-cream border border-vintage-sand text-sm text-vintage-ink focus:outline-none focus:border-vintage-brown"
                   style={{ borderRadius: "var(--radius-vintage)" }} />
          </div>
          <button type="submit" className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs tracking-widest uppercase hover:bg-vintage-brown"
                  style={{ borderRadius: "var(--radius-button)" }}>
            Найти
          </button>
        </form>
      </div>

      {/* Tabelle */}
      <div className="bg-vintage-white border border-vintage-sand overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
        {daten.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="w-12 h-12 text-vintage-sand mb-3" />
            <p className="font-serif text-vintage-brown text-lg">Входящие пусты</p>
            <p className="text-xs text-vintage-dust mt-1">
              {suche ? `Нет результатов для «${suche}»` : "Пока нет обращений"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-vintage-sand bg-vintage-parchment/50 text-xs uppercase tracking-widest text-vintage-dust">
                  <th className="text-left px-4 py-3 font-normal w-32">Канал</th>
                  <th className="text-left px-4 py-3 font-normal">Контакт</th>
                  <th className="text-left px-4 py-3 font-normal hidden md:table-cell">Сообщение</th>
                  <th className="text-left px-4 py-3 font-normal w-32 hidden lg:table-cell">Назначено</th>
                  <th className="text-center px-4 py-3 font-normal w-28">Статус</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-vintage-sand/40">
                {daten.items.map(l => {
                  const q = QUELLE_META[l.quelle];
                  const Icon = q.icon;
                  const stat = STATUS_META[l.status];
                  return (
                    <tr key={l.id} className="hover:bg-vintage-parchment/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1.5 text-xs ${q.klasse}`}>
                          <Icon className="w-3.5 h-3.5" /> {q.label}
                        </div>
                        <p className="text-xs text-vintage-dust mt-1">{new Date(l.erstellt_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-vintage-ink text-sm">{l.kontakt_name ?? l.kontakt_handle ?? "—"}</p>
                        {l.kontakt_email && <p className="text-xs text-vintage-dust truncate max-w-48">{l.kontakt_email}</p>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-vintage-ink text-sm truncate max-w-md">{l.betreff || l.vorschau || "—"}</p>
                        {l.produkt_name && <p className="text-xs text-vintage-gold truncate max-w-md">↳ {l.produkt_name}</p>}
                      </td>
                      <td className="px-4 py-3 text-vintage-dust text-xs hidden lg:table-cell">
                        {l.zugewiesen_an_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs border ${stat.klasse}`}
                              style={{ borderRadius: "var(--radius-vintage)" }}>
                          {stat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/leads/${l.id}`} className="inline-flex p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
                              style={{ borderRadius: "var(--radius-vintage)" }} title="Открыть">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {daten.seiten > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-vintage-dust font-sans">
            Страница {daten.seite} из {daten.seiten} · {daten.gesamt} всего
          </p>
          <div className="flex gap-2">
            {daten.seite > 1 && (
              <Link href={link({ seite: String(daten.seite - 1) })}
                    className="px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                    style={{ borderRadius: "var(--radius-button)" }}>← Назад</Link>
            )}
            {daten.seite < daten.seiten && (
              <Link href={link({ seite: String(daten.seite + 1) })}
                    className="px-3 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
                    style={{ borderRadius: "var(--radius-button)" }}>Вперёд →</Link>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-vintage-dust">
        <CheckCircle2 className="w-3 h-3 inline mr-1" />
        Instagram и Telegram будут подключены во 2/3 сессии — интерфейс входящих уже готов.
      </p>
    </div>
  );
}
