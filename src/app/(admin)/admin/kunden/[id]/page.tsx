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

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает",
  paid: "Оплачен",
  fulfilled: "Отправлен",
  completed: "Завершён",
  cancelled: "Отменён",
  refunded: "Возврат",
};

export default async function KundenDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
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
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/kunden" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Клиенты
        </Link>
        <span>/</span>
        <span className="font-mono text-vintage-gold">KD-{customer.customer_number.toString().padStart(4, "0")}</span>
      </nav>

      {/* Header-Karte */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-vintage-parchment border border-vintage-sand flex items-center justify-center flex-shrink-0" style={{ borderRadius: "var(--radius-card)" }}>
            <span className="text-vintage-brown text-2xl font-serif">
              {(customer.vorname ?? customer.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-vintage-espresso">
              {customer.vorname} {customer.nachname}
            </h1>
            <p className="text-xs text-vintage-gold font-sans mt-1">{TYPE_LABEL[customer.customer_type]}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm font-sans text-vintage-dust">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
              {customer.telefon && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.telefon}</span>}
              {customer.company_name && <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {customer.company_name}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> С {new Date(customer.erstellt_am).toLocaleDateString("ru-RU")}</span>
              <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> KD-{customer.customer_number.toString().padStart(4, "0")}</span>
            </div>
            {customer.dnc_aktiv && (
              <p className="text-xs text-vintage-burgundy font-sans mt-2 italic">
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

      {/* Pipeline-Stage */}
      <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
        <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust mb-3">Этап воронки</p>
        <StageSelector customerId={customer.id} stages={stages} aktuelleStage={customer.pipeline_stage_id ?? null} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tags */}
        <TagsSection customerId={customer.id} alleTags={allTags} kundenTags={kundenTags} />

        {/* Tasks */}
        <TasksSection customerId={customer.id} tasks={tasks} />
      </div>

      {/* Notes */}
      <NotesSection customerId={customer.id} notes={notes} />

      {/* Bestellungen */}
      <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso mb-3">Заказы ({orders.length})</h2>
        {orders.length === 0 ? (
          <p className="text-vintage-dust text-sm font-sans text-center py-4">Пока нет</p>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {orders.slice(0, 10).map(o => (
              <Link key={o.id} href={`/admin/bestellungen/${o.id}`} className="py-2 flex items-center justify-between hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors">
                <div>
                  <p className="font-mono text-vintage-gold text-sm">GDT-{o.order_number}</p>
                  <p className="text-xs text-vintage-dust">{new Date(o.erstellt_am).toLocaleDateString("ru-RU")} · {ORDER_STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
                <p className="font-serif text-vintage-espresso">{formatPreis(o.total_cents / 100)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Activity-Timeline (Orders + Leads + Events + Tasks + Notes unified) */}
      <ActivityTimeline entries={timeline} />
    </div>
  );
}

function StatBox({ icon: Icon, label, wert }: { icon: React.ElementType; label: string; wert: string | number }) {
  return (
    <div className="bg-vintage-white border border-vintage-sand p-4" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-vintage-gold" />
        <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust">{label}</p>
      </div>
      <p className="font-serif text-lg text-vintage-espresso">{wert}</p>
    </div>
  );
}
