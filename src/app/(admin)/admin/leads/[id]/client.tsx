"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Mail, Package, MessageSquare, Send,
  CheckCircle2, AlertTriangle, EyeOff, UserPlus, Loader2, Tag as TagIcon,
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
import { useModuleBase } from "@/lib/module-base-client";
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
  const mbase = useModuleBase();
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
    <div className="record-layout">
      {/* ─── Hauptspalte: Konversation ────────────────────────────── */}
      <div className="record-main">

        {error && (
          <div className="flex items-start gap-3 px-5 py-3 text-sm font-sans"
               style={{ background: "rgba(194,71,71,0.10)", border: "1px solid rgba(194,71,71,0.30)", color: "var(--color-vintage-burgundy)", borderRadius: "var(--radius-card)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        {/* Header-Card */}
        <section className="record-card space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="field-label">{lead.quelle.replace("_"," ")}</p>
              <h1 className="record-section-title mt-1">
                <User className="w-4 h-4" />
                {lead.kontakt_name ?? lead.kontakt_handle ?? lead.kontakt_email ?? "Неизвестно"}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm" style={{ color: "var(--color-ink-mute)" }}>
                {lead.kontakt_email && (
                  <a href={`mailto:${lead.kontakt_email}`} className="flex items-center gap-1" style={{ color: "var(--color-ink-soft)" }}>
                    <Mail className="w-3 h-3" /> {lead.kontakt_email}
                  </a>
                )}
                {lead.kontakt_handle && (
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {lead.kontakt_handle}</span>
                )}
              </div>
            </div>
            <div className="text-xs text-right" style={{ color: "var(--color-ink-mute)" }}>
              <p>{new Date(lead.erstellt_am).toLocaleString("ru-RU")}</p>
              {lead.beantwortet_am && (
                <p className="mt-1" style={{ color: "var(--color-vintage-forest)" }}>
                  Отвечено: {new Date(lead.beantwortet_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit"})}
                </p>
              )}
            </div>
          </div>

          {lead.betreff && (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              <p className="field-label mb-1">Тема</p>
              <p className="field-value">{lead.betreff}</p>
            </div>
          )}

          {lead.produkt_id && lead.produkt_name && (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              <p className="field-label mb-1">Товар</p>
              <Link href={`${mbase}/produkte/${lead.produkt_id}`}
                    className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--color-coral-deep)" }}>
                <Package className="w-3.5 h-3.5" /> {lead.produkt_name}
              </Link>
            </div>
          )}

          {lead.customer_id ? (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              <p className="field-label mb-1">Клиент</p>
              <Link href={`${mbase}/kunden/${lead.customer_id}`}
                    className="hover:underline" style={{ color: "var(--color-coral-deep)" }}>{lead.customer_email}</Link>
            </div>
          ) : (
            <div className="pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              {showCustomerForm ? (
                <div className="space-y-2">
                  <p className="field-label">Создать клиента</p>
                  <Input label="Имя" value={custName} onChange={(e)=>setCustName(e.target.value)} />
                  <Input label="E-Mail" value={custEmail} onChange={(e)=>setCustEmail(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" loading={pending} onClick={customerAnlegen}>Создать и привязать</Button>
                    <Button size="sm" variant="ghost" onClick={()=>setShowCustomerForm(false)}>Отмена</Button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>setShowCustomerForm(true)}
                        className="flex items-center gap-2 text-xs font-sans uppercase tracking-widest" style={{ color: "var(--color-coral-deep)" }}>
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
          <section className="record-card space-y-3">
            <h2 className="record-section-title">
              <MessageSquare className="w-4 h-4" /> Исходное сообщение
            </h2>
            <div className="text-sm whitespace-pre-line pl-4 py-2" style={{ color: "var(--color-ink)", borderLeft: "2px solid rgba(232,112,58,0.40)" }}>
              {originalText}
            </div>
          </section>
        )}

        {/* Konversation */}
        {messages.length > 0 && (
          <section className="record-card space-y-4">
            <h2 className="record-section-title">Переписка</h2>
            <div className="space-y-3">
              {messages.map(m => {
                const bg = m.richtung === "outbound" ? "rgba(232,112,58,0.06)"
                  : m.richtung === "interne_notiz" ? "var(--color-paper-warm)" : "var(--color-app-surface)";
                const side = m.richtung === "outbound" ? "ml-8" : m.richtung === "interne_notiz" ? "" : "mr-8";
                return (
                  <div key={m.id} className={`p-3 ${side}`}
                       style={{ background: bg, border: "1px solid var(--color-line)", borderRadius: "var(--radius-vintage)" }}>
                    <div className="flex items-center justify-between text-xs mb-1" style={{ color: "var(--color-ink-mute)" }}>
                      <span className="uppercase tracking-widest">
                        {m.richtung === "outbound" ? "Админ → клиент" :
                         m.richtung === "interne_notiz" ? "Внутренняя заметка" : "Клиент → админ"}
                        {m.autor_name && ` · ${m.autor_name}`}
                      </span>
                      <span>{new Date(m.gesendet_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                    <p className="text-sm whitespace-pre-line" style={{ color: "var(--color-ink)" }}>{m.text}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Notiz/Antwort hinzufügen */}
        <section className="record-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="record-section-title">Ответ / заметка</h2>
            <div className="flex gap-1 text-xs">
              <button onClick={()=>setNotizRichtung("interne_notiz")}
                      className="px-3 py-1 transition-colors"
                      style={notizRichtung==="interne_notiz"
                        ? { background: "var(--color-ink)", color: "var(--color-bone)", border: "1px solid var(--color-ink)", borderRadius: "var(--radius-vintage)" }
                        : { border: "1px solid var(--color-line)", color: "var(--color-ink-soft)", borderRadius: "var(--radius-vintage)" }}>
                Внутренняя заметка
              </button>
              <button onClick={()=>setNotizRichtung("outbound")}
                      className="px-3 py-1 transition-colors"
                      style={notizRichtung==="outbound"
                        ? { background: "var(--color-coral)", color: "#fff", border: "1px solid var(--color-coral)", borderRadius: "var(--radius-vintage)" }
                        : { border: "1px solid var(--color-line)", color: "var(--color-ink-soft)", borderRadius: "var(--radius-vintage)" }}>
                Отправленный ответ
              </button>
            </div>
          </div>
          <Textarea value={notiz} onChange={(e)=>setNotiz(e.target.value)}
                    rows={4}
                    placeholder={notizRichtung==="outbound" ? "Что Вы ответили клиенту? (заметка в системе — отправка остаётся вручную)" : "Внутренняя заметка — видна только админам"} />
          <p className="text-xs" style={{ color: "var(--color-ink-mute)" }}>
            Примечание: это сообщение сохраняется только в системе. Фактическая отправка выполняется вручную через Ваш канал (e-mail, IG, …).
          </p>
          <Button size="sm" onClick={sendNotiz} loading={pending}
                  icon={<Send className="w-3.5 h-3.5" />}>
            {notizRichtung === "outbound" ? "Зафиксировать ответ" : "Сохранить заметку"}
          </Button>
        </section>
      </div>

      {/* ─── Aside: Action-Bar ────────────────────────────────────── */}
      <aside className="record-aside">
        <div className="record-aside-sticky flex flex-col gap-4">
          <section className="record-card space-y-4">
            <h3 className="record-section-title">Действия</h3>

            <Select label="Статус" value={lead.status}
                    options={STATUS_OPTIONS}
                    onChange={(e)=>changeStatus((e.target as HTMLSelectElement).value as LeadStatus)} />

            <Select label="Приоритет" value={lead.prioritaet}
                    options={PRIO_OPTIONS}
                    onChange={(e)=>changePrio((e.target as HTMLSelectElement).value as LeadPrioritaet)} />

            <Select label="Назначено" value={lead.zugewiesen_an ?? ""}
                    options={[{ value: "", label: "— Никому —" }, ...admins.map(a=>({ value: a.id, label: a.name }))]}
                    onChange={(e)=>changeZuweisung((e.target as HTMLSelectElement).value)} />

            <div className="pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--color-line)" }}>
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
            <section className="record-card space-y-2">
              <h3 className="field-label flex items-center gap-1.5">
                <TagIcon className="w-3 h-3" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {lead.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 text-xs"
                        style={{ background: "var(--color-paper-warm)", border: "1px solid var(--color-line)", color: "var(--color-ink-soft)", borderRadius: "var(--radius-vintage)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Meta */}
          <section className="p-4 text-xs space-y-1 font-mono"
                   style={{ background: "var(--color-paper-warm)", border: "1px solid var(--color-line)", color: "var(--color-ink-mute)", borderRadius: "var(--radius-card)" }}>
            <p>ID: {lead.id.slice(0, 8)}…</p>
            {lead.externe_id && <p>Внешний ID: {lead.externe_id.slice(0, 20)}{lead.externe_id.length>20?"…":""}</p>}
            <p>Последнее изменение: {new Date(lead.aktualisiert_am).toLocaleString("ru-RU",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</p>
          </section>
        </div>
      </aside>
    </div>
  );
}
