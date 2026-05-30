"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Briefcase, Mail, ExternalLink } from "lucide-react";
import { stageVerschiebenAction } from "./actions";
import { useModuleBase } from "@/lib/module-base-client";
import type { PipelineStage } from "@/types/crm";

/* ──────────────────────────────────────────────────────────────────────────
 * KanbanBoard — Twenty-Politur: kompakte ruhige Karten, saubere Spalten,
 * Touch-Aktivierungs-Constraint (verhindert versehentliches Drag bei Scroll).
 * ────────────────────────────────────────────────────────────────────────── */

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

  /* Touch-Sensor: 250 ms Delay + 5 px Toleranz — User kann scrollen ohne
   * versehentlich Karten zu verschieben. Mouse-Sensor bleibt sofort. */
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const customerId = String(event.active.id);
    const stageId    = event.over ? parseInt(String(event.over.id), 10) : null;
    if (!stageId) return;
    setKunden(prev => prev.map(k =>
      k.customer_id === customerId ? { ...k, stage_id: stageId } : k
    ));
    startTransition(() => stageVerschiebenAction(customerId, stageId));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Horizontaler Scroll auf kleinen Screens; ab lg füllen Spalten den Platz. */}
      <div
        className="overflow-x-auto pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stages.length}, minmax(240px, 1fr))`,
            gap: "0.75rem",
            minWidth: `${stages.length * 252}px`,
          }}
        >
          {stages.map(stage => (
            <StageColumn
              key={stage.id}
              stage={stage}
              kunden={kunden.filter(k => k.stage_id === stage.id)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

function StageColumn({ stage, kunden }: { stage: PipelineStage; kunden: Kunde[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        background:    "var(--color-app-surface)",
        border:        "1px solid var(--color-line)",
        borderTop:     `3px solid ${stage.farbe}`,
        borderRadius:  "var(--radius-card)",
        outline:       isOver ? "2px solid var(--color-coral)" : "2px solid transparent",
        outlineOffset: "2px",
        minHeight:     "22rem",
        transition:    "outline 100ms ease",
      }}
      className="p-3"
    >
      {/* Spalten-Header */}
      <div className="flex items-center justify-between mb-3 pb-2"
           style={{ borderBottom: "1px solid var(--color-line)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: stage.farbe }} />
          <p className="font-serif text-sm truncate" style={{ color: "var(--color-ink)" }}>
            {stage.name}
          </p>
        </div>
        <span className="font-mono text-xs flex-shrink-0 ml-2"
              style={{ color: "var(--color-ink-mute)" }}>
          {kunden.length}
        </span>
      </div>

      {/* Karten */}
      <div className="space-y-1.5">
        {kunden.length === 0 ? (
          <p className="text-xs text-center py-8 italic"
             style={{ color: "var(--color-ink-mute)" }}>
            пусто
          </p>
        ) : kunden.map(k => (
          <DraggableKundenKarte key={k.customer_id} kunde={k} />
        ))}
      </div>
    </div>
  );
}

function DraggableKundenKarte({ kunde }: { kunde: Kunde }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: kunde.customer_id });
  const mbase = useModuleBase();
  const istB2B = kunde.customer_type.startsWith("b2b");

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform:   transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity:     isDragging ? 0.45 : 1,
        cursor:      isDragging ? "grabbing" : "grab",
        background:  "var(--color-bone)",
        border:      "1px solid var(--color-line)",
        borderRadius: "var(--radius-card)",
        boxShadow:   isDragging ? "0 8px 24px rgba(15,20,48,0.15)" : undefined,
        userSelect:  "none",
        touchAction: "none",
        transition:  isDragging ? undefined : "box-shadow 150ms ease",
        zIndex:      isDragging ? 50 : undefined,
      }}
      className="p-2.5"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Name — Serif, eine Zeile */}
          <p className="font-serif text-sm truncate leading-tight"
             style={{ color: "var(--color-ink)" }}>
            {kunde.customer_name}
          </p>
          {/* E-Mail — mono, gedimmt */}
          <p className="flex items-center gap-1 mt-0.5 truncate"
             style={{ fontSize: "0.6875rem", color: "var(--color-ink-mute)", fontFamily: "var(--font-mono)" }}>
            <Mail className="w-2.5 h-2.5 flex-shrink-0" />
            {kunde.customer_email}
          </p>
          {/* B2B-Chip — nur wenn relevant */}
          {istB2B && (
            <span className="inline-flex items-center gap-0.5 mt-1"
                  style={{ fontSize: "0.625rem", color: "var(--color-coral-deep)", fontFamily: "var(--font-sans)" }}>
              <Briefcase className="w-2.5 h-2.5" />
              {kunde.customer_type === "b2b_verified" ? "B2B ✓" : "B2B ожидает"}
            </span>
          )}
        </div>

        {/* Link-Button — klickbar ohne Drag auszulösen */}
        <Link
          href={`${mbase}/kunden/${kunde.customer_id}`}
          onClick={e => e.stopPropagation()}
          className="row-action flex-shrink-0"
          style={{ padding: "0.25rem" }}
          aria-label="Открыть"
          draggable={false}
        >
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
