import Link from "next/link";
import { tasksListe } from "@/lib/db/crm";
import { TaskRow } from "./task-row";
import { CheckSquare } from "lucide-react";
import type { Metadata } from "next";
import type { TaskStatus } from "@/types/crm";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const FILTER: Array<{ value: TaskStatus | ""; label: string }> = [
  { value: "",          label: "Alle"        },
  { value: "offen",     label: "Offen"       },
  { value: "in_arbeit", label: "In Arbeit"   },
  { value: "erledigt",  label: "Erledigt"    },
];

export default async function TasksAdminPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (sp.status as TaskStatus | undefined) ?? "";
  const tasks  = await tasksListe({ status });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Tasks</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">{tasks.length} Tasks</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-vintage-sand pb-1">
        {FILTER.map(f => (
          <Link key={f.value}
            href={f.value ? `/admin/crm/tasks?status=${f.value}` : "/admin/crm/tasks"}
            className={`px-4 py-2 text-xs font-sans uppercase tracking-widest transition-colors ${
              status === f.value ? "bg-vintage-espresso text-vintage-cream" : "text-vintage-dust hover:bg-vintage-parchment hover:text-vintage-brown"
            }`}
            style={{ borderRadius: "var(--radius-button)" }}>
            {f.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <CheckSquare className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Keine Tasks</p>
          <p className="text-xs text-vintage-dust font-sans mt-1">Tasks werden im Kunden-Detail angelegt.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
    </div>
  );
}
