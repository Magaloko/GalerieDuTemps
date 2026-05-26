import Link from "next/link";
import {
  ShoppingBag, Inbox, FileText, CheckSquare, MessageSquare,
  Activity, ArrowUpRight,
} from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import type { TimelineEntry } from "@/lib/db/leads";

interface Props { entries: TimelineEntry[] }

const TYP_META: Record<TimelineEntry["typ"], {
  icon: React.ElementType; klasse: string; label: string;
}> = {
  order: { icon: ShoppingBag,    klasse: "text-vintage-gold     bg-vintage-gold/10",     label: "Bestellung" },
  lead:  { icon: Inbox,          klasse: "text-vintage-brown    bg-vintage-parchment",   label: "Lead"       },
  event: { icon: Activity,       klasse: "text-vintage-sage     bg-vintage-sage/10",     label: "Event"      },
  task:  { icon: CheckSquare,    klasse: "text-vintage-copper   bg-vintage-copper/10",   label: "Task"       },
  note:  { icon: MessageSquare,  klasse: "text-vintage-dust     bg-vintage-parchment",   label: "Notiz"      },
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
  if (e.typ === "order") {
    const cents = (e.meta?.total_cents as number) ?? 0;
    return (
      <span className="text-vintage-dust">
        Status: <strong className="text-vintage-brown">{e.detail}</strong> · {formatPreis(cents / 100)}
      </span>
    );
  }
  if (e.typ === "lead") {
    return (
      <span className="text-vintage-dust">
        {String(e.meta?.quelle ?? "").replace("_"," ")} · Status: <strong className="text-vintage-brown">{e.meta?.status as string}</strong>
      </span>
    );
  }
  if (e.typ === "task") {
    return (
      <span className="text-vintage-dust">
        Status: <strong className="text-vintage-brown">{e.detail}</strong>
      </span>
    );
  }
  if (e.typ === "event") {
    return <span className="text-vintage-dust">{e.detail}</span>;
  }
  return null;
}

export function ActivityTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <section className="bg-vintage-white border border-vintage-sand p-5"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso mb-2">История активности</h2>
        <p className="text-sm text-vintage-dust">Пока нет событий.</p>
      </section>
    );
  }

  return (
    <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4"
             style={{ borderRadius: "var(--radius-card)" }}>
      <h2 className="font-serif text-lg text-vintage-espresso">История активности</h2>
      <ol className="relative border-l border-vintage-sand/60 pl-6 space-y-4">
        {entries.map((e, i) => {
          const m = TYP_META[e.typ];
          const Icon = m.icon;
          const href = entryLink(e);
          const content = (
            <>
              <span className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 border border-vintage-sand bg-vintage-white ${m.klasse.split(" ")[0]}`}
                    style={{ borderRadius: "50%" }}>
                <Icon className="w-3 h-3" />
              </span>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-vintage-dust mb-0.5">
                    {m.label}
                  </p>
                  <p className="text-sm text-vintage-ink font-sans truncate">
                    {e.titel}
                  </p>
                  <div className="text-xs mt-0.5">{entryDetail(e)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-vintage-dust whitespace-nowrap">{formatTs(e.ts)}</span>
                  {href && <ArrowUpRight className="w-3 h-3 text-vintage-dust group-hover:text-vintage-brown" />}
                </div>
              </div>
            </>
          );
          return (
            <li key={i} className="relative">
              {href ? (
                <Link href={href} className="group block hover:bg-vintage-parchment/40 -mx-2 px-2 py-2 transition-colors"
                      style={{ borderRadius: "var(--radius-vintage)" }}>
                  {content}
                </Link>
              ) : (
                <div className="py-2">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
