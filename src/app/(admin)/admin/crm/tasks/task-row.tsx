"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckSquare, Square, Trash2, User } from "lucide-react";
import { taskStatusAction, taskDeleteAction } from "../../kunden/[id]/actions";
import { useModuleBase } from "@/lib/module-base-client";
import type { Task, TaskPrioritaet } from "@/types/crm";

const PRIO_STYLE: Record<TaskPrioritaet, string> = {
  niedrig:  "bg-vintage-dust/10     text-vintage-dust",
  normal:   "bg-vintage-brown/10    text-vintage-brown",
  hoch:     "bg-vintage-copper/10   text-vintage-copper",
  dringend: "bg-vintage-burgundy/10 text-vintage-burgundy",
};

const PRIO_LABEL: Record<TaskPrioritaet, string> = {
  niedrig:  "Низкий",
  normal:   "Обычный",
  hoch:     "Высокий",
  dringend: "Срочный",
};

export function TaskRow({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();
  const mbase = useModuleBase();

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-vintage-white border border-vintage-sand ${task.status === "erledigt" ? "opacity-60" : ""} ${pending ? "opacity-50" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <button
        onClick={() => startTransition(() =>
          taskStatusAction(task.id, task.status === "erledigt" ? "offen" : "erledigt", task.customer_id ?? undefined)
        )}
        className="flex-shrink-0"
      >
        {task.status === "erledigt"
          ? <CheckSquare className="w-5 h-5 text-vintage-sage" />
          : <Square className="w-5 h-5 text-vintage-dust hover:text-vintage-brown" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-serif ${task.status === "erledigt" ? "line-through text-vintage-dust" : "text-vintage-espresso"}`}>
          {task.titel}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-sans">
          <span className={`px-2 py-0.5 ${PRIO_STYLE[task.prioritaet]}`} style={{ borderRadius: "var(--radius-vintage)" }}>
            {PRIO_LABEL[task.prioritaet]}
          </span>
          {task.customer_name && (
            <Link href={`${mbase}/kunden/${task.customer_id}`} className="text-vintage-brown hover:text-vintage-espresso flex items-center gap-1">
              <User className="w-3 h-3" /> {task.customer_name}
            </Link>
          )}
          {task.faellig_am && (
            <span className="text-vintage-dust">
              до {new Date(task.faellig_am).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => { if (confirm("Удалить задачу?")) startTransition(() => taskDeleteAction(task.id, task.customer_id ?? undefined)); }}
        className="text-vintage-dust hover:text-vintage-burgundy p-1.5"
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
