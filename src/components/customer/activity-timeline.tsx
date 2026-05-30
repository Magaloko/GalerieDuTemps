import Link from "next/link";
import {
  ShoppingBag, Inbox, FileText, CheckSquare, MessageSquare,
  Activity, ArrowUpRight,
} from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import type { TimelineEntry } from "@/lib/db/leads";

interface Props { entries: TimelineEntry[] }

/* Icon je Eintragstyp — EIN ruhiger Akzent (Coral) statt buntem Farbcode. */
const TYP_META: Record<TimelineEntry["typ"], { icon: React.ElementType; label: string }> = {
  order: { icon: ShoppingBag,   label: "Заказ"   },
  lead:  { icon: Inbox,         label: "Лид"     },
  event: { icon: Activity,      label: "Событие" },
  task:  { icon: CheckSquare,   label: "Задача"  },
  note:  { icon: MessageSquare, label: "Заметка" },
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  const heute = new Date();
  if (d.toDateString() === heute.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + " · сегодня";
  }
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function entryLink(e: TimelineEntry): string | null {
  switch (e.typ) {
    case "order": return `/admin/bestellungen/${e.ref_id}`;
    case "lead":  return `/admin/leads/${e.ref_id}`;
    case "task":  return `/admin/crm/tasks`;
    default:      return null;
  }
}

function entryDetail(e: TimelineEntry): React.ReactNode {
  const strong = (s: React.ReactNode) => <strong style={{ color: "var(--color-ink)" }}>{s}</strong>;
  if (e.typ === "order") {
    const cents = (e.meta?.total_cents as number) ?? 0;
    return <>Status: {strong(e.detail)} · {formatPreis(cents / 100)}</>;
  }
  if (e.typ === "lead") {
    return <>{String(e.meta?.quelle ?? "").replace("_", " ")} · Status: {strong(e.meta?.status as string)}</>;
  }
  if (e.typ === "task")  return <>Status: {strong(e.detail)}</>;
  if (e.typ === "event") return <>{e.detail}</>;
  return null;
}

/**
 * ActivityTimeline — vereinheitlichte Chronik aus orders, leads, events,
 * tasks und notes (read-only). Record-Detail-Kit: .record-card + .timeline-Rail.
 */
export function ActivityTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <section className="record-card">
        <h2 className="record-section-title mb-2">История активности</h2>
        <p className="text-sm font-sans" style={{ color: "var(--color-ink-mute)" }}>Пока нет событий.</p>
      </section>
    );
  }

  return (
    <section className="record-card">
      <h2 className="record-section-title mb-4">История активности</h2>
      <div className="timeline">
        {entries.map((e, i) => {
          const m = TYP_META[e.typ];
          const Icon = m.icon;
          const href = entryLink(e);
          const inner = (
            <>
              <span className="timeline-dot" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
                    <span className="field-label">{m.label}</span>
                  </p>
                  <p className="timeline-text truncate mt-0.5" style={{ color: "var(--color-ink)" }}>{e.titel}</p>
                  <div className="timeline-text" style={{ fontSize: "0.75rem" }}>{entryDetail(e)}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="timeline-time whitespace-nowrap">{formatTs(e.ts)}</span>
                  {href && <ArrowUpRight className="w-3 h-3" style={{ color: "var(--color-ink-mute)" }} />}
                </div>
              </div>
            </>
          );
          return href ? (
            <Link key={i} href={href} className="timeline-item block -mx-2 px-2 transition-colors" style={{ paddingLeft: "1.25rem" }}>
              {inner}
            </Link>
          ) : (
            <div key={i} className="timeline-item">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
