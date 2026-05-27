"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Phone, Tag as TagIcon, Package, MessageSquare, Send,
  CheckCircle2, AlertTriangle, Clock, EyeOff, UserPlus, Loader2,
} from "lucide-react";
import { Select }   from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import {
  leadStatusAction, leadPrioritaetAction, leadZuweisenAction,
  leadNotizAction, leadAlsCustomerAnlegenAction,
} from "../actions";
import { OrderFromLead } from "@/components/leads/order-from-lead";
import type { Lead, LeadMessage, AdminBenutzer, LeadStatus, LeadPrioritaet } from "@/lib/db/leads";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "neu",          label: "Новый"          },
  { value: "gelesen",      label: "Прочитан"       },
  { value: "in_arbeit",    label: "В работе"       },
  { value: "beantwortet",  label: "Отвечен"        },
  { value: "qualifiziert", label: "Квалифицирован" },
  { value: "verloren",     label: "Потерян"        },
  { value: "archiviert",   label: "В архиве"       },
];

const PRIO_OPTIONS: { value: LeadPrioritaet; label: string }[] = [
  { value: "niedrig",  label: "Низкий"    },
  { value: "normal",   label: "Обычный"   },
  { value: "hoch",     label: "Высокий"   },
  { value: "dringend", label: "Срочный"   },
];

interface Props {
  lead:         Lead;
  messages:     LeadMessage[];
  originalText: string | null;
  admins:       AdminBenutzer[];
}

export function LeadDetailClient({ lead: leadInit, messages, originalText, admins }: Props) {
  const router = useRouter();
  const [lead, setLead] = useState(leadInit);
  const [pending, start] = useTransition();
  const [notiz, setNotiz] = useState("");
  const [notizRichtung, setNotizRichtung] = useState<"interne_notiz"|"outbound">("interne_notiz");
  const [error, setError] = useState<string | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [custEmail, setCustEmail] = useState(lead.kontakt_email ?? "");
  const [custName,  setCustName]  = useState(lead.kontakt_name ?? "");

  const runAction = (fn: () => Promise<{ ok: boolean; error?: string }>, optimistic?: () => void) => {
    setError(null);
    optimistic?.();
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Ошибка");
      router.refresh();
    });
  };

  const changeStatus = (s: LeadStatus) =>
    runAction(() => leadStatusAction(lead.id, s), () => setLead({ ...lead, status: s }));

  const changePrio = (p: LeadPrioritaet) =>
    runAction(() => leadPrioritaetAction(lead.id, p), () => setLead({ ...lead, prioritaet: p }));

  const changeZuweisung = (v: string) => {
    const id = v || null;
    const name = admins.find(a => a.id === id)?.name ?? null;
    runAction(() => leadZuweisenAction(lead.id, id), () =>
      setLead({ ...lead, zugewiesen_an: id, zugewiesen_an_name: name }));
  };

  const sendNotiz = () => {
    if (!notiz.trim()) return;
    runAction(async () => {
      const r = await leadNotizAction(lead.id, notiz, notizRichtung);
      if (r.ok) setNotiz("");
      return r;
    });
  };

  const customerAnlegen = () => {
    if (!custEmail || !custName) { setError("Требуются имя и e-mail"); return; }
    runAction(() => leadAlsCustomerAnlegenAction(lead.id, custEmail, custName));
    setShowCustomerForm(false);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* ─── Haupt: Konversation ──────────────────────────────────── */}
      <div className="space-y-6">

        {error && (
          <div className="flex items-start gap-3 px-5 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm font-sans text-vintage-burgundy"
               style={{ borderRadius: "var(--radius-card)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        {/* Header-Card */}
        <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-vintage-dust">{lead.quelle.replace("_"," ")}</p>
              <h1 className="font-serif text-xl text-vintage-espresso flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-vintage-gold" />
                {lead.kontakt_name ?? lead.kontakt_handle ?? lead.kontakt_email ?? "Неизвестно"}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-vintage-dust">
                {lead.kontakt_email && (
                  <a href={`mailto:${lead.kontakt_email}`} className="hover:text-vintage-brown flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {lead.kontakt_email}
                  </a>
                )}
                {lead.kontakt_handle && (
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {lead.kontakt_handle}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-vintage-dust text-right">
              <p>{new Date(lead.erstellt_am).toLocaleString("ru-RU")}</p>
              {lead.beantwortet_am && (
                <p className="text-vintage-sage mt-1">
                  Отвечено: {new Date(lead.beantwortet_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit"})}
                </p>
              )}
            </div>
          </div>

          {lead.betreff && (
            <div className="border-t border-vintage-sand/40 pt-3">
              <p className="text-xs uppercase tracking-widest text-vintage-dust mb-1">Тема</p>
              <p className="text-vintage-ink">{lead.betreff}</p>
            </div>
          )}

          {lead.produkt_id && lead.produkt_name && (
            <div className="border-t border-vintage-sand/40 pt-3">
              <p className="text-xs uppercase tracking-widest text-vintage-dust mb-1">Товар</p>
              <Link href={`/admin/produkte/${lead.produkt_id}`}
                    className="inline-flex items-center gap-1 text-vintage-gold hover:underline">
                <Package className="w-3.5 h-3.5" /> {lead.produkt_name}
              </Link>
            </div>
          )}

          {lead.customer_id ? (
            <div className="border-t border-vintage-sand/40 pt-3">
              <p className="text-xs uppercase tracking-widest text-vintage-dust mb-1">Клиент</p>
              <Link href={`/admin/kunden/${lead.customer_id}`}
                    className="text-vintage-gold hover:underline">{lead.customer_email}</Link>
            </div>
          ) : (
            <div className="border-t border-vintage-sand/40 pt-3">
              {showCustomerForm ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-vintage-dust">Создать клиента</p>
                  <Input label="Имя" value={custName} onChange={(e)=>setCustName(e.target.value)} />
                  <Input label="E-Mail" value={custEmail} onChange={(e)=>setCustEmail(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" loading={pending} onClick={customerAnlegen}>Создать и привязать</Button>
                    <Button size="sm" variant="ghost" onClick={()=>setShowCustomerForm(false)}>Отмена</Button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>setShowCustomerForm(true)}
                        className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest text-vintage-gold hover:text-vintage-amber">
                  <UserPlus className="w-3.5 h-3.5" /> Создать клиента и привязать
                </button>
              )}
            </div>
          )}
        </section>

        {/* Bestellung aus Lead */}
        <OrderFromLead leadId={lead.id} hatEmail={!!(lead.kontakt_email || lead.customer_email)} />

        {/* Original-Text (Kontaktformular) */}
        {originalText && (
          <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
                   style={{ borderRadius: "var(--radius-card)" }}>
            <h2 className="font-serif text-base text-vintage-espresso flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-vintage-gold" /> Исходное сообщение
            </h2>
            <div className="text-sm text-vintage-ink whitespace-pre-line border-l-2 border-vintage-gold/40 pl-4 py-2">
              {originalText}
            </div>
          </section>
        )}

        {/* Konversation */}
        {messages.length > 0 && (
          <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
                   style={{ borderRadius: "var(--radius-card)" }}>
            <h2 className="font-serif text-base text-vintage-espresso">Переписка</h2>
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`p-3 border ${
                  m.richtung === "outbound"      ? "bg-vintage-gold/5 border-vintage-gold/30 ml-8" :
                  m.richtung === "interne_notiz" ? "bg-vintage-parchment border-vintage-sand"      :
                                                    "bg-vintage-white border-vintage-sand mr-8"
                }`} style={{ borderRadius: "var(--radius-vintage)" }}>
                  <div className="flex items-center justify-between text-xs text-vintage-dust mb-1">
                    <span className="uppercase tracking-widest">
                      {m.richtung === "outbound" ? "Админ → клиент" :
                       m.richtung === "interne_notiz" ? "Внутренняя заметка" : "Клиент → админ"}
                      {m.autor_name && ` · ${m.autor_name}`}
                    </span>
                    <span>{new Date(m.gesendet_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <p className="text-sm text-vintage-ink whitespace-pre-line">{m.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notiz/Antwort hinzufügen */}
        <section className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-base text-vintage-espresso">Ответ / заметка</h2>
            <div className="flex gap-1 text-xs">
              <button onClick={()=>setNotizRichtung("interne_notiz")}
                      className={`px-3 py-1 border transition-colors ${
                        notizRichtung==="interne_notiz" ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso" : "border-vintage-sand text-vintage-brown"
                      }`} style={{ borderRadius: "var(--radius-vintage)" }}>
                Внутренняя заметка
              </button>
              <button onClick={()=>setNotizRichtung("outbound")}
                      className={`px-3 py-1 border transition-colors ${
                        notizRichtung==="outbound" ? "bg-vintage-gold text-vintage-espresso border-vintage-gold" : "border-vintage-sand text-vintage-brown"
                      }`} style={{ borderRadius: "var(--radius-vintage)" }}>
                Отправленный ответ
              </button>
            </div>
          </div>
          <Textarea value={notiz} onChange={(e)=>setNotiz(e.target.value)}
                    rows={4}
                    placeholder={notizRichtung==="outbound" ? "Что Вы ответили клиенту? (заметка в системе — отправка остаётся вручную)" : "Внутренняя заметка — видна только админам"} />
          <p className="text-xs text-vintage-dust">
            Примечание: это сообщение сохраняется только в системе. Фактическая отправка выполняется вручную через Ваш канал (e-mail, IG, …).
          </p>
          <Button size="sm" onClick={sendNotiz} loading={pending}
                  icon={<Send className="w-3.5 h-3.5" />}>
            {notizRichtung === "outbound" ? "Зафиксировать ответ" : "Сохранить заметку"}
          </Button>
        </section>
      </div>

      {/* ─── Sidebar: Action-Bar ──────────────────────────────────── */}
      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <h3 className="font-serif text-base text-vintage-espresso">Действия</h3>

          <Select label="Статус" value={lead.status}
                  options={STATUS_OPTIONS}
                  onChange={(e)=>changeStatus((e.target as HTMLSelectElement).value as LeadStatus)} />

          <Select label="Приоритет" value={lead.prioritaet}
                  options={PRIO_OPTIONS}
                  onChange={(e)=>changePrio((e.target as HTMLSelectElement).value as LeadPrioritaet)} />

          <Select label="Назначено" value={lead.zugewiesen_an ?? ""}
                  options={[{ value: "", label: "— Никому —" }, ...admins.map(a=>({ value: a.id, label: a.name }))]}
                  onChange={(e)=>changeZuweisung((e.target as HTMLSelectElement).value)} />

          <div className="pt-3 border-t border-vintage-sand/40 flex flex-col gap-2">
            <Button size="sm" variant={lead.status==="beantwortet"?"secondary":"primary"}
                    onClick={()=>changeStatus(lead.status==="beantwortet" ? "in_arbeit" : "beantwortet")}
                    icon={pending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle2 className="w-3.5 h-3.5" />}>
              {lead.status==="beantwortet" ? "Открыть снова" : "Отметить как отвеченный"}
            </Button>
            {lead.status !== "archiviert" && (
              <Button size="sm" variant="ghost" onClick={()=>changeStatus("archiviert")}
                      icon={<EyeOff className="w-3.5 h-3.5" />}>
                Архивировать
              </Button>
            )}
          </div>
        </section>

        {/* Tags */}
        {lead.tags.length > 0 && (
          <section className="bg-vintage-white border border-vintage-sand p-5 space-y-2"
                   style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="text-xs uppercase tracking-widest text-vintage-dust flex items-center gap-1.5">
              <TagIcon className="w-3 h-3" /> Tags
            </h3>
            <div className="flex flex-wrap gap-1">
              {lead.tags.map(t => (
                <span key={t} className="px-2 py-0.5 bg-vintage-parchment border border-vintage-sand text-xs"
                      style={{ borderRadius: "var(--radius-vintage)" }}>
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Meta */}
        <section className="bg-vintage-parchment border border-vintage-sand p-4 text-xs text-vintage-dust space-y-1 font-mono"
                 style={{ borderRadius: "var(--radius-card)" }}>
          <p>ID: {lead.id.slice(0, 8)}…</p>
          {lead.externe_id && <p>Внешний ID: {lead.externe_id.slice(0, 20)}{lead.externe_id.length>20?"…":""}</p>}
          <p>Последнее изменение: {new Date(lead.aktualisiert_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>
        </section>
      </aside>
    </div>
  );
}
