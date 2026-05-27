"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Star, StarOff, Trash2, GripVertical, Loader2, CheckSquare, Square,
  Edit2, Check, X,
} from "lucide-react";
import type { Produktbild } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * BildGalerie v2 — verbesserte Galerie mit:
 *  - Lazy-loading der Thumbnails (url_thumb 400px, ~30kb statt 3MB Original)
 *  - Inline-Alt-Text-Edit (Click pencil → input → save)
 *  - Bulk-Select + Bulk-Delete (mehrere auswählen, dann löschen-Button)
 *  - Quality-Badges (Dimensionen, Format, Filesize)
 *  - Drag-Sort wie bisher
 *  - Hauptbild-Toggle wie bisher
 * ────────────────────────────────────────────────────────────────────────── */

interface BildGalerieProps {
  initialBilder: Produktbild[];
  produktId:     string;
}

// ── Helper: Beste verfügbare URL für die Galerie-Grid (Thumb wenn da, sonst Original) ──
function thumbSrc(b: Produktbild): string {
  return b.url_thumb || b.url;
}

// ── Helper: Quality-Badge-Text ────────────────────────────────────────────
function qualityBadge(b: Produktbild): string {
  const parts: string[] = [];
  if (b.breite && b.hoehe) parts.push(`${b.breite}×${b.hoehe}`);
  if (b.dateigroesse) {
    const kb = b.dateigroesse / 1024;
    parts.push(kb < 1024 ? `${Math.round(kb)} КБ` : `${(kb / 1024).toFixed(1)} МБ`);
  }
  if (b.format) parts.push(b.format.toUpperCase());
  return parts.join(" · ");
}

// ──────────────────────────────────────────────────────────────────────────
// Sortierbare Bild-Kachel
// ──────────────────────────────────────────────────────────────────────────
interface SortableBildProps {
  bild:           Produktbild;
  onLoeschen:     (id: string) => void;
  onHauptbild:    (id: string) => void;
  onSelectToggle: (id: string) => void;
  onAltTextSave:  (id: string, alt: string) => Promise<void>;
  isSelected:     boolean;
  isLoading:      boolean;
  selectMode:     boolean;
}

function SortableBild({
  bild, onLoeschen, onHauptbild, onSelectToggle, onAltTextSave,
  isSelected, isLoading, selectMode,
}: SortableBildProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bild.id });

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
    zIndex:     isDragging ? 50 : undefined,
  };

  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft]     = useState(bild.alt_text ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAlt) inputRef.current?.focus();
  }, [editingAlt]);

  const saveAlt = async () => {
    if (altDraft.trim() === (bild.alt_text ?? "").trim()) {
      setEditingAlt(false);
      return;
    }
    try {
      await onAltTextSave(bild.id, altDraft.trim());
    } finally {
      setEditingAlt(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group bg-vintage-parchment border overflow-hidden flex flex-col
        ${bild.ist_hauptbild ? "border-vintage-gold ring-1 ring-vintage-gold" : "border-vintage-sand"}
        ${isSelected ? "ring-2 ring-vintage-coral ring-offset-1" : ""}
      `}
      {...attributes}
    >
      {/* Bild + Overlay */}
      <div className="relative aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc(bild)}
          alt={bild.alt_text ?? "Produktbild"}
          className="w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />

        {/* Select-Checkbox (immer sichtbar im Select-Mode oder per Hover) */}
        <button
          type="button"
          onClick={() => onSelectToggle(bild.id)}
          className={`absolute top-2 left-2 p-1 transition-opacity ${
            selectMode || isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            background:    isSelected ? "var(--color-coral)" : "rgba(255,255,255,0.9)",
            color:         isSelected ? "#fff" : "var(--color-ink)",
            borderRadius:  "var(--radius-vintage)",
          }}
          aria-label={isSelected ? "Снять выделение" : "Выделить"}
        >
          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        {/* Hauptbild-Badge */}
        {bild.ist_hauptbild && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-vintage-gold text-vintage-espresso text-[10px] font-mono uppercase tracking-widest"
               style={{ borderRadius: "var(--radius-vintage)" }}>
            <Star className="w-2.5 h-2.5 fill-current" /> Главное
          </div>
        )}

        {/* Hover-Action-Overlay */}
        <div className="
          absolute inset-0 bg-vintage-espresso/0 group-hover:bg-vintage-espresso/55
          transition-colors flex items-center justify-center gap-2
          opacity-0 group-hover:opacity-100
        ">
          <button
            {...listeners}
            className="p-2 bg-white/20 hover:bg-white/30 text-white cursor-grab active:cursor-grabbing"
            style={{ borderRadius: "var(--radius-vintage)" }}
            title="Переместить"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            onClick={() => onHauptbild(bild.id)}
            disabled={bild.ist_hauptbild || isLoading}
            className="p-2 bg-white/20 hover:bg-vintage-gold/60 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: "var(--radius-vintage)" }}
            title={bild.ist_hauptbild ? "Уже главное" : "Сделать главным"}
          >
            {bild.ist_hauptbild
              ? <Star    className="w-4 h-4 fill-current text-vintage-gold" />
              : <StarOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { if (confirm("Удалить фото?")) onLoeschen(bild.id); }}
            disabled={isLoading}
            className="p-2 bg-white/20 hover:bg-vintage-burgundy/60 text-white disabled:opacity-50"
            style={{ borderRadius: "var(--radius-vintage)" }}
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Loading-Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-vintage-brown" />
          </div>
        )}
      </div>

      {/* Alt-Text + Quality-Badge */}
      <div className="px-2 py-1.5 border-t border-vintage-sand/50 bg-white">
        {editingAlt ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  saveAlt();
                if (e.key === "Escape") { setEditingAlt(false); setAltDraft(bild.alt_text ?? ""); }
              }}
              className="flex-1 min-w-0 text-[11px] px-1 py-0.5 border border-vintage-sand bg-vintage-parchment"
              placeholder="Описание (alt-текст)"
              maxLength={200}
            />
            <button onClick={saveAlt} className="p-0.5 text-vintage-sage" aria-label="Сохранить">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setEditingAlt(false); setAltDraft(bild.alt_text ?? ""); }}
                    className="p-0.5 text-vintage-dust" aria-label="Отмена">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingAlt(true)}
            className="w-full text-left flex items-center gap-1 text-[11px] text-vintage-ink hover:text-vintage-gold transition-colors group/alt"
            title="Кликни для редактирования alt-текста"
          >
            <span className="flex-1 truncate">
              {bild.alt_text
                ? <span>{bild.alt_text}</span>
                : <span className="italic text-vintage-dust">Без описания</span>}
            </span>
            <Edit2 className="w-3 h-3 shrink-0 opacity-0 group-hover/alt:opacity-100 transition-opacity" />
          </button>
        )}
        {qualityBadge(bild) && (
          <p className="text-[9px] font-mono text-vintage-dust mt-0.5 truncate">
            {qualityBadge(bild)}
          </p>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Galerie mit Drag-Sort + Bulk-Select
// ──────────────────────────────────────────────────────────────────────────
export function BildGalerie({ initialBilder, produktId }: BildGalerieProps) {
  const [bilder,    setBilder]    = useState<Produktbild[]>(initialBilder);
  const [loading,   setLoading]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor,  { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Initialer State sync (z.B. nach erstem Upload)
  useEffect(() => {
    setBilder(initialBilder);
  }, [initialBilder]);

  // ── Drag-End: Reihenfolge ─────────────────────────────────────────────────
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

      await fetch(`/api/bilder/${active.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sortierungen: neueBilder.map(b => ({ id: b.id, sortierung: b.sortierung })),
        }),
      });
    },
    [bilder],
  );

  // ── Löschen (Einzeln) ─────────────────────────────────────────────────────
  const handleLoeschen = useCallback(async (id: string) => {
    setLoading(id);
    try {
      await fetch(`/api/bilder/${id}`, { method: "DELETE" });
      setBilder(prev => prev.filter(b => b.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } finally {
      setLoading(null);
    }
  }, []);

  // ── Bulk-Löschen ──────────────────────────────────────────────────────────
  const handleBulkLoeschen = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} фото?`)) return;
    const ids = [...selectedIds];
    await Promise.all(
      ids.map(id => fetch(`/api/bilder/${id}`, { method: "DELETE" })),
    );
    setBilder(prev => prev.filter(b => !selectedIds.has(b.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  // ── Hauptbild setzen ──────────────────────────────────────────────────────
  const handleHauptbild = useCallback(async (id: string) => {
    setLoading(id);
    try {
      await fetch(`/api/bilder/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ist_hauptbild: true, produkt_id: produktId }),
      });
      setBilder(prev =>
        prev.map(b => ({ ...b, ist_hauptbild: b.id === id })),
      );
    } finally {
      setLoading(null);
    }
  }, [produktId]);

  // ── Select-Toggle ─────────────────────────────────────────────────────────
  const handleSelectToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }, []);

  // ── Alt-Text speichern ────────────────────────────────────────────────────
  const handleAltTextSave = useCallback(async (id: string, alt: string) => {
    setBilder(prev => prev.map(b => b.id === id ? { ...b, alt_text: alt } : b));
    await fetch(`/api/bilder/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ alt_text: alt }),
    });
  }, []);

  // ── Empty-State ───────────────────────────────────────────────────────────
  if (bilder.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 border border-dashed border-vintage-sand text-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <p className="font-serif text-vintage-brown">Ещё нет фото</p>
        <p className="text-vintage-dust text-xs font-sans mt-1">
          Загрузите выше, чтобы начать
        </p>
      </div>
    );
  }

  const selectMode = selectedIds.size > 0;

  return (
    <div className="space-y-3">
      {/* Bulk-Action-Bar */}
      {selectMode && (
        <div
          className="flex items-center justify-between gap-3 p-3"
          style={{
            background:   "rgba(232,112,58,0.08)",
            border:       "1px solid rgba(232,112,58,0.30)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <p className="text-sm font-sans text-vintage-ink">
            Выбрано: <strong>{selectedIds.size}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 hover:bg-vintage-sand/40 transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              Снять
            </button>
            <button
              onClick={handleBulkLoeschen}
              className="text-[11px] font-mono uppercase tracking-widest px-3 py-1.5 bg-vintage-burgundy/10 text-vintage-burgundy border border-vintage-burgundy/30 hover:bg-vintage-burgundy/20 transition-colors inline-flex items-center gap-1.5"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить выбранные
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={bilder.map(b => b.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {bilder.map(bild => (
              <SortableBild
                key={bild.id}
                bild={bild}
                onLoeschen={handleLoeschen}
                onHauptbild={handleHauptbild}
                onSelectToggle={handleSelectToggle}
                onAltTextSave={handleAltTextSave}
                isSelected={selectedIds.has(bild.id)}
                isLoading={loading === bild.id}
                selectMode={selectMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export default BildGalerie;
export type { BildGalerieProps };
