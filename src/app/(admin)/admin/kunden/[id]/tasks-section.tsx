"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { taskCreateAction, taskStatusAction, taskDeleteAction } from "./actions";
import type { Task, TaskPrioritaet } from "@/types/crm";

const PRIO_COLOR: Record<TaskPrioritaet, string> = {
  niedrig:  "var(--color-ink-mute)",
  normal:   "var(--color-ink-soft)",
  hoch:     "var(--color-coral-deep)",
  dringend: "var(--color-vintage-burgundy)",
};

const PRIO_LABEL: Record<TaskPrioritaet, string> = {
  niedrig: "низкий",
  normal: "обычный",
  hoch: "высокий",
  dringend: "срочный",
};

export function TasksSection({ customerId, tasks }: { customerId: string; tasks: Task[] }) {
  const [neuTitel, setNeuTitel] = useState("");
  const [neuFrist, setNeuFrist] = useState("");
  const [neuPrio,  setNeuPrio]  = useState<TaskPrioritaet>("normal");
  const [pending, startTransition] = useTransition();

  const handleAdd = async () => {
    if (!neuTitel.trim()) return;
    startTransition(async () => {
      const r = await taskCreateAction({
        customer_id: customerId,
        titel:       neuTitel,
        prioritaet:  neuPrio,
        faellig_am:  neuFrist || undefined,
      });
      if (r.ok) { setNeuTitel(""); setNeuFrist(""); setNeuPrio("normal"); }
    });
  };

  return (
    <section className="record-card">
      <h2 className="record-section-title mb-4">
        <CheckSquare className="w-4 h-4" /> Задачи ({tasks.length})
      </h2>

      {/* Neuer Task */}
      <div className="space-y-2 mb-4 p-3" style={{ background: "var(--color-paper-warm)", borderRadius: "var(--radius-vintage)" }}>
        <input
          value={neuTitel}
          onChange={(e) => setNeuTitel(e.target.value)}
          placeholder="Что нужно сделать?"
          className="field-input"
        />
        <div className="flex gap-2">
          <select value={neuPrio} onChange={(e) => setNeuPrio(e.target.value as TaskPrioritaet)}
            className="field-input flex-1">
            <option value="niedrig">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="hoch">Высокий</option>
            <option value="dringend">Срочный</option>
          </select>
          <input type="date" value={neuFrist} onChange={(e) => setNeuFrist(e.target.value)}
            className="field-input flex-1" />
          <button onClick={handleAdd} disabled={!neuTitel.trim() || pending}
            className="btn-coral btn-coral-sm disabled:opacity-50 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Добавить
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs font-sans text-center py-4 italic" style={{ color: "var(--color-ink-mute)" }}>Задач нет</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => (
            <div key={t.id} className={`flex items-center gap-2 p-2 ${t.status === "erledigt" ? "opacity-50" : ""}`}
              style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-vintage)" }}>
              <button onClick={() => startTransition(() =>
                taskStatusAction(t.id, t.status === "erledigt" ? "offen" : "erledigt", customerId)
              )} className="flex-shrink-0" aria-label="Переключить">
                {t.status === "erledigt"
                  ? <CheckSquare className="w-4 h-4" style={{ color: "var(--color-vintage-forest)" }} />
                  : <Square className="w-4 h-4" style={{ color: "var(--color-ink-mute)" }} />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans" style={{ color: t.status === "erledigt" ? "var(--color-ink-mute)" : "var(--color-ink)", textDecoration: t.status === "erledigt" ? "line-through" : "none" }}>
                  {t.titel}
                </p>
                <div className="flex gap-2 text-[10px] font-sans" style={{ color: "var(--color-ink-mute)" }}>
                  <span style={{ color: PRIO_COLOR[t.prioritaet] }}>{PRIO_LABEL[t.prioritaet]}</span>
                  {t.faellig_am && <span>· до {new Date(t.faellig_am).toLocaleDateString("ru-RU")}</span>}
                </div>
              </div>
              <button onClick={() => { if (confirm("Удалить?")) startTransition(() => taskDeleteAction(t.id, customerId)); }}
                className="p-1 transition-colors" style={{ color: "var(--color-ink-mute)" }} aria-label="Удалить">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
