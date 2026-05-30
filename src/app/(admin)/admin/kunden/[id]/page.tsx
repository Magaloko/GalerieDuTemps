import { getModuleBase } from "@/lib/module-base-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { customerById } from "@/lib/db/customers";
import { ordersFuerCustomer } from "@/lib/db/orders";
import {
  alleTags, tagsFuerCustomer,
  notesFuerCustomer, tasksListe,
  alleStages, customerCrmStats,
} from "@/lib/db/crm";
import { customerTimeline } from "@/lib/db/leads";
import { ActivityTimeline } from "@/components/customer/activity-timeline";
import { formatPreis } from "@/lib/utils/preis";
import { orderStatusMeta } from "@/lib/utils/order-status";
import { ChevronLeft, Mail, Phone, Briefcase, Calendar, Hash, ShoppingBag, Coins } from "lucide-react";
import { TagsSection } from "./tags-section";
import { NotesSection } from "./notes-section";
import { TasksSection } from "./tasks-section";
import { StageSelector } from "./stage-selector";
import { DncButton } from "./dnc-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Детали клиента" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  b2c: "Частный клиент",
  b2b_pending: "B2B — ожидает активации",
  b2b_verified: "B2B — подтверждён",
  b2b_rejected: "B2B — отклонён",
};

export default async function KundenDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const base = await getModuleBase();
  const { id } = await params;
  const [customer, orders, allTags, kundenTags, notes, tasks, stages, stats, timeline] = await Promise.all([
    customerById(id),
    ordersFuerCustomer(id),
    alleTags(),
    tagsFuerCustomer(id),
    notesFuerCustomer(id),
    tasksListe({ customer_id: id, limit: 20 }),
    alleStages(),
    customerCrmStats(id),
    customerTimeline(id, 30).catch(() => []),
  ]);

  if (!customer) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <nav className="record-breadcrumb">
        <Link href={`${base}/kunden`}>
          <ChevronLeft className="w-3 h-3" /> Клиенты
        </Link>
        <span>/</span>
        <span className="crumb-id">KD-{customer.customer_number.toString().padStart(4, "0")}</span>
      </nav>

      {/* Header-Karte */}
      <section className="record-card">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-paper-warm)", border: "1px solid var(--color-line)", borderRadius: "var(--radius-card)" }}>
            <span className="text-2xl font-serif" style={{ color: "var(--color-ink-soft)" }}>
              {(customer.vorname ?? customer.email ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="list-title">
              {customer.vorname} {customer.nachname}
            </h1>
            <p className="eyebrow mt-1">{TYPE_LABEL[customer.customer_type]}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm font-sans" style={{ color: "var(--color-ink-mute)" }}>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
              {customer.telefon && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.telefon}</span>}
              {customer.company_name && <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {customer.company_name}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> С {new Date(customer.erstellt_am).toLocaleDateString("ru-RU")}</span>
              <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> KD-{customer.customer_number.toString().padStart(4, "0")}</span>
            </div>
            {customer.dnc_aktiv && (
              <p className="text-xs font-sans mt-2 italic" style={{ color: "var(--color-vintage-burgundy)" }}>
                ⚠️ DNC активен с {customer.dnc_seit && new Date(customer.dnc_seit).toLocaleDateString("ru-RU")}
                {customer.dnc_grund && ` – ${customer.dnc_grund}`}
              </p>
            )}
          </div>
          <DncButton customerId={customer.id} istDnc={customer.dnc_aktiv ?? false} />
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox icon={ShoppingBag} label="Заказы" wert={stats.bestellungen_anzahl} />
        <StatBox icon={Coins}       label="Общая сумма"   wert={formatPreis(stats.bestellungen_summe_cent / 100)} />
        <StatBox icon={Calendar}    label="Последний заказ" wert={stats.letzte_bestellung_am ? new Date(stats.letzte_bestellung_am).toLocaleDateString("ru-RU") : "–"} />
        <StatBox icon={Calendar}    label="Открытые задачи" wert={stats.tasks_offen} />
      </div>

      {/* Zweispalter: Stammdaten/CRM links, Activity-Timeline als Aside rechts */}
      <div className="record-layout">
        <div className="record-main">
          {/* Pipeline-Stage */}
          <section className="record-card">
            <p className="field-label mb-3">Этап воронки</p>
            <StageSelector customerId={customer.id} stages={stages} aktuelleStage={customer.pipeline_stage_id ?? null} />
          </section>

          <div className="grid md:grid-cols-2 gap-5">
            <TagsSection customerId={customer.id} alleTags={allTags} kundenTags={kundenTags} />
            <TasksSection customerId={customer.id} tasks={tasks} />
          </div>

          <NotesSection customerId={customer.id} notes={notes} />

          {/* Bestellungen */}
          <section className="record-card">
            <h2 className="record-section-title mb-3">Заказы ({orders.length})</h2>
            {orders.length === 0 ? (
              <p className="text-sm font-sans text-center py-4" style={{ color: "var(--color-ink-mute)" }}>Пока нет</p>
            ) : (
              <div style={{ borderTop: "1px solid var(--color-line)" }}>
                {orders.slice(0, 10).map(o => (
                  <Link key={o.id} href={`${base}/bestellungen/${o.id}`} className="py-2.5 flex items-center justify-between -mx-2 px-2 transition-colors" style={{ borderBottom: "1px solid var(--color-line)" }}>
                    <div>
                      <p className="font-mono text-sm" style={{ color: "var(--color-coral-deep)" }}>GDT-{o.order_number}</p>
                      <p className="text-xs" style={{ color: "var(--color-ink-mute)" }}>{new Date(o.erstellt_am).toLocaleDateString("ru-RU")} · {orderStatusMeta(o.status).label}</p>
                    </div>
                    <p className="font-serif" style={{ color: "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}>{formatPreis(o.total_cents / 100)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Aside: Activity-Timeline (Orders + Leads + Events + Tasks + Notes unified) */}
        <aside className="record-aside">
          <div className="record-aside-sticky">
            <ActivityTimeline entries={timeline} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, wert }: { icon: React.ElementType; label: string; wert: string | number }) {
  return (
    <div className="kpi">
      <p className="kpi-label"><Icon className="w-3.5 h-3.5" /> {label}</p>
      <p className="kpi-value">{wert}</p>
    </div>
  );
}
