"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Star,
  StarOff,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react";
import type { Produktbild } from "@/types/produkt";

// ---------------------------------------------------------------------------
// Einzelnes sortierbares Bild
// ---------------------------------------------------------------------------
interface SortableBildProps {
  bild:        Produktbild;
  onLoeschen:  (id: string) => void;
  onHauptbild: (id: string) => void;
  isLoading:   boolean;
}

function SortableBild({ bild, onLoeschen, onHauptbild, isLoading }: SortableBildProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bild.id });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
    zIndex:     isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group bg-vintage-parchment border overflow-hidden
        ${bild.ist_hauptbild ? "border-vintage-gold ring-1 ring-vintage-gold" : "border-vintage-sand"}
      `}
      {...attributes}
    >
      {/* Bild */}
      <div className="aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bild.url}
          alt={bild.alt_text ?? "Produktbild"}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Hover-Overlay */}
      <div className="
        absolute inset-0 bg-vintage-espresso/0 group-hover:bg-vintage-espresso/50
        transition-colors flex items-center justify-center gap-2
        opacity-0 group-hover:opacity-100
      ">
        {/* Drag Handle */}
        <button
          {...listeners}
          className="p-2 bg-white/20 hover:bg-white/30 text-white cursor-grab active:cursor-grabbing"
          style={{ borderRadius: "var(--radius-vintage)" }}
          title="Verschieben"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Hauptbild */}
        <button
          onClick={() => onHauptbild(bild.id)}
          disabled={bild.ist_hauptbild || isLoading}
          className="p-2 bg-white/20 hover:bg-vintage-gold/60 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ borderRadius: "var(--radius-vintage)" }}
          title={bild.ist_hauptbild ? "Ist Hauptbild" : "Als Hauptbild setzen"}
        >
          {bild.ist_hauptbild ? (
            <Star className="w-4 h-4 fill-current text-vintage-gold" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>

        {/* Löschen */}
        <button
          onClick={() => {
            if (confirm("Bild löschen?")) onLoeschen(bild.id);
          }}
          disabled={isLoading}
          className="p-2 bg-white/20 hover:bg-vintage-burgundy/60 text-white disabled:opacity-50"
          style={{ borderRadius: "var(--radius-vintage)" }}
          title="Löschen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hauptbild-Badge */}
      {bild.ist_hauptbild && (
        <div className="absolute top-2 left-2">
          <span
            className="flex items-center gap-1 px-2 py-0.5 bg-vintage-gold text-vintage-espresso text-xs font-sans"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <Star className="w-2.5 h-2.5 fill-current" /> Hauptbild
          </span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-vintage-brown" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bild-Galerie (Drag-and-Drop)
// ---------------------------------------------------------------------------
interface BildGalerieProps {
  initialBilder: Produktbild[];
  produktId:     string;
}

export function BildGalerie({ initialBilder, produktId }: BildGalerieProps) {
  const [bilder,   setBilder]   = useState<Produktbild[]>(initialBilder);
  const [loading,  setLoading]  = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag-End: Reihenfolge aktualisieren
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = bilder.findIndex(b => b.id === active.id);
      const newIndex = bilder.findIndex(b => b.id === over.id);
      const neueBilder = arrayMove(bilder, oldIndex, newIndex).map((b, i) => ({
        ...b,
        sortierung: i,
      }));

      setBilder(neueBilder);

      // In DB speichern
      await fetch(`/api/bilder/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sortierungen: neueBilder.map(b => ({ id: b.id, sortierung: b.sortierung })),
        }),
      });
    },
    [bilder]
  );

  // Bild löschen
  const handleLoeschen = useCallback(async (id: string) => {
    setLoading(id);
    try {
      await fetch(`/api/bilder/${id}`, { method: "DELETE" });
      setBilder(prev => prev.filter(b => b.id !== id));
    } finally {
      setLoading(null);
    }
  }, []);

  // Hauptbild setzen
  const handleHauptbild = useCallback(async (id: string) => {
    setLoading(id);
    try {
      await fetch(`/api/bilder/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ist_hauptbild: true, produkt_id: produktId }),
      });
      setBilder(prev =>
        prev.map(b => ({ ...b, ist_hauptbild: b.id === id }))
      );
    } finally {
      setLoading(null);
    }
  }, [produktId]);

  // Neues Bild einfügen (nach Upload)
  const handleNeuesBild = useCallback(
    (bild: { id: string; url: string; ist_hauptbild: boolean }) => {
      setBilder(prev => [
        ...prev.map(b =>
          bild.ist_hauptbild ? { ...b, ist_hauptbild: false } : b
        ),
        {
          id:            bild.id,
          produkt_id:    produktId,
          url:           bild.url,
          alt_text:      null,
          sortierung:    prev.length,
          ist_hauptbild: bild.ist_hauptbild,
          breite:        null,
          hoehe:         null,
          dateigroesse:  null,
          erstellt_am:   new Date().toISOString(),
        },
      ]);
    },
    [produktId]
  );

  if (bilder.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 border border-dashed border-vintage-sand text-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <p className="font-serif text-vintage-brown">Noch keine Bilder</p>
        <p className="text-vintage-dust text-xs font-sans mt-1">
          Lade oben Bilder hoch, um zu beginnen
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={bilder.map(b => b.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {bilder.map(bild => (
            <SortableBild
              key={bild.id}
              bild={bild}
              onLoeschen={handleLoeschen}
              onHauptbild={handleHauptbild}
              isLoading={loading === bild.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Export für externe Nutzung (Bilder-Upload-Seite)
export { type BildGalerieProps };
export { BildGalerie as default };
