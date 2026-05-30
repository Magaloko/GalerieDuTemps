"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, useDroppable, useDraggable, type DragEndEvent } from "@dnd-kit/core";
import { Briefcase, Mail, ExternalLink } from "lucide-react";
import { stageVerschiebenAction } from "./actions";
import { useModuleBase } from "@/lib/module-base-client";
import type { PipelineStage } from "@/types/crm";

interface Kunde {
  customer_id:    string;
  customer_name:  string;
  customer_email: string;
  customer_type:  string;
  stage_id:       number;
  letzter_login:  string | null;
}

export function KanbanBoard({
  stages,
  kunden: kundenInit,
}: { stages: PipelineStage[]; kunden: Kunde[] }) {
  const [kunden, setKunden] = useState(kundenInit);
  const [, startTransition] = useTransition();

  const handleDragEnd = (event: DragEndEvent) => {
    const customerId = String(event.active.id);
    const stageId    = event.over ? parseInt(String(event.over.id), 10) : null;
    if (!stageId) return;

    // Optimistic update
    setKunden(prev => prev.map(k => k.customer_id === customerId ? { ...k, stage_id: stageId } : k));
    startTransition(() => stageVerschiebenAction(customerId, stageId));
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid gap-4 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(260px, 1fr))` }}>
        {stages.map(stage => (
          <StageColumn key={stage.id} stage={stage} kunden={kunden.filter(k => k.stage_id === stage.id)} />
        ))}
      </div>
    </DndContext>
  );
}

function StageColumn({ stage, kunden }: { stage: PipelineStage; kunden: Kunde[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`bg-vintage-white border border-vintage-sand p-4 min-h-96 ${isOver ? "ring-2 ring-vintage-gold" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-vintage-sand/50">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: stage.farbe }} />
          <p className="font-serif text-vintage-espresso">{stage.name}</p>
        </div>
        <span className="text-xs font-sans text-vintage-dust">{kunden.length}</span>
      </div>

      <div className="space-y-2">
        {kunden.length === 0 ? (
          <p className="text-xs text-vintage-dust font-sans text-center py-8 italic">пусто</p>
        ) : kunden.map(k => <DraggableKundenKarte key={k.customer_id} kunde={k} />)}
      </div>
    </div>
  );
}

function DraggableKundenKarte({ kunde }: { kunde: Kunde }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: kunde.customer_id });
  const mbase = useModuleBase();

  const istB2B = kunde.customer_type.startsWith("b2b");

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity:   isDragging ? 0.5 : 1,
        cursor:    "grab",
      }}
      className="p-3 bg-vintage-parchment border border-vintage-sand hover:border-vintage-brown transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm text-vintage-espresso truncate">{kunde.customer_name}</p>
          <p className="text-xs text-vintage-dust font-sans flex items-center gap-1 mt-0.5">
            <Mail className="w-2.5 h-2.5" /> {kunde.customer_email}
          </p>
          {istB2B && (
            <p className="text-xs text-vintage-gold font-sans flex items-center gap-1 mt-1">
              <Briefcase className="w-2.5 h-2.5" /> {kunde.customer_type === "b2b_verified" ? "B2B ✓" : "B2B ожидает"}
            </p>
          )}
        </div>
        <Link
          href={`${mbase}/kunden/${kunde.customer_id}`}
          onClick={e => e.stopPropagation()}
          className="text-vintage-dust hover:text-vintage-brown flex-shrink-0"
          aria-label="Подробнее"
        >
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
