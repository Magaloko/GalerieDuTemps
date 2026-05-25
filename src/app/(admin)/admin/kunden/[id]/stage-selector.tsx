"use client";

import { useTransition } from "react";
import { stageSetAction } from "./actions";
import type { PipelineStage } from "@/types/crm";

export function StageSelector({
  customerId, stages, aktuelleStage,
}: { customerId: string; stages: PipelineStage[]; aktuelleStage: number | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {stages.map(s => (
        <button
          key={s.id}
          onClick={() => startTransition(() => stageSetAction(customerId, s.id))}
          disabled={pending}
          className={`px-3 py-1.5 text-xs font-sans uppercase tracking-widest transition-all ${
            aktuelleStage === s.id ? "text-white scale-105" : "border border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
          }`}
          style={{
            borderRadius: "var(--radius-button)",
            background:   aktuelleStage === s.id ? s.farbe : "transparent",
          }}
        >
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: aktuelleStage === s.id ? "white" : s.farbe }} />
          {s.name}
        </button>
      ))}
    </div>
  );
}
