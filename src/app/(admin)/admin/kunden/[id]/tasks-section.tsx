"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, Plus, Trash2 } from "lucide-react";
import { taskCreateAction, taskStatusAction, taskDeleteAction } from "./actions";
import type { Task, TaskPrioritaet } from "@/types/crm";

const PRIO_STYLE: Record<TaskPrioritaet, string> = {
  niedrig:  "text-vintage-dust",
  normal:   "text-vintage-brown",
  hoch:     "text-vintage-copper",
  dringend: "text-vintage-burgundy",
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
    <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
        <CheckSquare className="w-4 h-4 text-vintage-gold" /> Задачи ({tasks.length})
      </h2>

      {/* Neuer Task */}
      <div className="space-y-2 mb-4 p-3 bg-vintage-parchment" style={{ borderRadius: "var(--radius-vintage)" }}>
        <input
          value={neuTitel}
          onChange={(e) => setNeuTitel(e.target.value)}
          placeholder="Что нужно сделать?"
          className="w-full px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans focus:outline-none focus:border-vintage-brown"
          style={{ borderRadius: "var(--radius-vintage)" }}
        />
        <div className="flex gap-2">
          <select value={neuPrio} onChange={(e) => setNeuPrio(e.target.value as TaskPrioritaet)}
            className="flex-1 px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans"
            style={{ borderRadius: "var(--radius-vintage)" }}>
            <option value="niedrig">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="hoch">Высокий</option>
            <option value="dringend">Срочный</option>
          </select>
          <input type="date" value={neuFrist} onChange={(e) => setNeuFrist(e.target.value)}
            className="flex-1 px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans"
            style={{ borderRadius: "var(--radius-vintage)" }} />
          <button onClick={handleAdd} disabled={!neuTitel.trim() || pending}
            className="px-3 py-2 bg-vintage-espresso text-vintage-cream text-xs uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50 flex items-center gap-1"
            style={{ borderRadius: "var(--radius-button)" }}>
            <Plus className="w-3 h-3" /> Добавить
          </button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-vintage-dust font-sans text-center py-4 italic">Задач нет</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(t => (
            <div key={t.id} className={`flex items-center gap-2 p-2 border border-vintage-sand ${t.status === "erledigt" ? "opacity-50" : ""}`}
              style={{ borderRadius: "var(--radius-vintage)" }}>
              <button onClick={() => startTransition(() =>
                taskStatusAction(t.id, t.status === "erledigt" ? "offen" : "erledigt", customerId)
              )} className="flex-shrink-0">
                {t.status === "erledigt"
                  ? <CheckSquare className="w-4 h-4 text-vintage-sage" />
                  : <Square className="w-4 h-4 text-vintage-dust hover:text-vintage-brown" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-sans ${t.status === "erledigt" ? "line-through text-vintage-dust" : "text-vintage-ink"}`}>
                  {t.titel}
                </p>
                <div className="flex gap-2 text-[10px] font-sans text-vintage-dust">
                  <span className={PRIO_STYLE[t.prioritaet]}>{PRIO_LABEL[t.prioritaet]}</span>
                  {t.faellig_am && <span>· до {new Date(t.faellig_am).toLocaleDateString("ru-RU")}</span>}
                </div>
              </div>
              <button onClick={() => { if (confirm("Удалить?")) startTransition(() => taskDeleteAction(t.id, customerId)); }}
                className="text-vintage-dust hover:text-vintage-burgundy p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
