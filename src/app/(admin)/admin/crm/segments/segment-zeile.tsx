"use client";

import { useTransition } from "react";
import { Trash2, Users } from "lucide-react";
import { segmentLoeschenAction } from "./actions";
import type { Segment } from "@/types/crm";

export function SegmentZeile({ segment }: { segment: Segment & { treffer?: number } }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between p-4 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-vintage-espresso">{segment.name}</p>
        {segment.beschreibung && <p className="text-xs text-vintage-dust font-sans">{segment.beschreibung}</p>}
        <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px] font-sans">
          {Object.entries(segment.filter).map(([k, v]) => (
            <span key={k} className="px-1.5 py-0.5 bg-vintage-parchment text-vintage-brown" style={{ borderRadius: "var(--radius-vintage)" }}>
              {k}: {Array.isArray(v) ? v.join(",") : String(v)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-serif text-vintage-gold text-xl flex items-center gap-1">
            <Users className="w-4 h-4" /> {segment.treffer ?? 0}
          </p>
          <p className="text-[10px] font-sans text-vintage-dust uppercase tracking-widest">Найдено</p>
        </div>
        <button
          onClick={() => {
            if (confirm(`Удалить сегмент «${segment.name}»?`)) startTransition(() => segmentLoeschenAction(segment.id));
          }}
          disabled={pending}
          className="p-2 text-vintage-dust hover:text-vintage-burgundy disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
