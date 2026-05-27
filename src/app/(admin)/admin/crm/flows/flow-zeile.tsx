"use client";

import { useTransition } from "react";
import { ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { flowToggleAction, flowDeleteAction } from "./actions";
import type { DripFlow } from "@/types/crm";

export function FlowZeile({ flow }: { flow: DripFlow }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`flex items-center justify-between p-4 bg-vintage-white border border-vintage-sand ${!flow.aktiv ? "opacity-60" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}>
      <div>
        <p className="font-serif text-vintage-espresso">{flow.name}</p>
        <p className="text-xs text-vintage-dust font-sans mt-0.5">
          Триггер: <span className="text-vintage-brown">{flow.trigger_typ}</span>
          {flow.trigger_param && ` (${flow.trigger_param})`}
        </p>
        {flow.beschreibung && <p className="text-xs text-vintage-dust font-sans mt-0.5">{flow.beschreibung}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => startTransition(() => flowToggleAction(flow.id, !flow.aktiv))}
          disabled={pending}
          className="p-2 text-vintage-brown hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}>
          {flow.aktiv ? <ToggleRight className="w-5 h-5 text-vintage-sage" /> : <ToggleLeft className="w-5 h-5 text-vintage-dust" />}
        </button>
        <button onClick={() => { if (confirm(`Удалить цепочку «${flow.name}»?`)) startTransition(() => flowDeleteAction(flow.id)); }}
          disabled={pending}
          className="p-2 text-vintage-dust hover:text-vintage-burgundy transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
