"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Touch-Aktivierungs-Constraint: Maus-Drag erst nach 8px Bewegung (Klicks/
  // Links bleiben nutzbar), Touch-Drag erst nach 200 ms Halten (Scroll bleibt
  // möglich). Ohne das startet Drag sofort beim Tippen → blockiert Scroll.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const customerId = String(event.active.id);
    const stageId    = event.over ? parseInt(String(event.over.id), 10) : null;
    if (!stageId) return;

    const current = kunden.find(k => k.customer_id === customerId);
    if (current && current.stage_id === stageId) return;  // kein No-op-Write

    // Optimistic update
    setKunden(prev => prev.map(k => k.customer_id === customerId ? { ...k, stage_id: stageId } : k));
    startTransition(() => stageVerschiebenAction(customerId, stageId));
  };

  const activeKunde = activeId ? kunden.find(k => k.customer_id === activeId) ?? null : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-board" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(240px, 1fr))` }}>
        {stages.map(stage => (
          <StageColumn key={stage.id} stage={stage} kunden={kunden.filter(k => k.stage_id === stage.id)} />
        ))}
      </div>

      {/* Floating-Clone beim Ziehen — ruhiger als transform-on-original. */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2,0.7,0.3,1)" }}>
        {activeKunde ? <KundenKarteInner kunde={activeKunde} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({ stage, kunden }: { stage: PipelineStage; kunden: Kunde[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div ref={setNodeRef} className={`kanban-column${isOver ? " kanban-column-over" : ""}`}>
      <div className="kanban-col-head">
        <div className="kanban-col-title">
          <span className="kanban-col-dot" style={{ background: stage.farbe }} />
          <span className="truncate">{stage.name}</span>
        </div>
        <span className="kanban-col-count">{kunden.length}</span>
      </div>

      <div className="kanban-stack">
        {kunden.length === 0 ? (
          <p className="kanban-empty">пусто</p>
        ) : kunden.map(k => <DraggableKundenKarte key={k.customer_id} kunde={k} />)}
      </div>
    </div>
  );
}

function DraggableKundenKarte({ kunde }: { kunde: Kunde }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: kunde.customer_id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <KundenKarteInner kunde={kunde} />
    </div>
  );
}

/* Reine Darstellung — geteilt zwischen Spalte (draggable) + DragOverlay. */
function KundenKarteInner({ kunde, overlay = false }: { kunde: Kunde; overlay?: boolean }) {
  const mbase = useModuleBase();
  const istB2B = kunde.customer_type.startsWith("b2b");

  return (
    <div className={`kanban-card${overlay ? " kanban-card-dragging" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="kanban-card-name truncate">{kunde.customer_name}</p>
          <p className="kanban-card-meta">
            <Mail className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{kunde.customer_email}</span>
          </p>
          {istB2B && (
            <p className="kanban-card-meta" style={{ color: "var(--color-coral-deep)" }}>
              <Briefcase className="w-2.5 h-2.5 shrink-0" />
              {kunde.customer_type === "b2b_verified" ? "B2B ✓" : "B2B ожидает"}
            </p>
          )}
        </div>
        {!overlay && (
          <Link
            href={`${mbase}/kunden/${kunde.customer_id}`}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className="row-action shrink-0"
            aria-label="Подробнее"
          >
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
