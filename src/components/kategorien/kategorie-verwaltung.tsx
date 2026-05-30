"use client";

import { useState, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, ChevronUp, ChevronDown, Pencil, Save, CheckCircle2,
  AlertCircle, CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { kategorienStrukturAction } from "@/app/(admin)/admin/kategorien/actions";

export interface KatRow {
  id:         number;
  name:       string;
  slug:       string;
  code:       string | null;
  eltern_id:  number | null;
  sortierung: number;
  aktiv:      boolean;
  anzahl:     number;
}

interface Props {
  initial: KatRow[];
  base:    string;
}

/** sortierung pro Gruppe (eltern_id) auf 0..n normalisieren (stabile Basis). */
function normalisiere(items: KatRow[]): KatRow[] {
  const gruppen = new Map<number | null, KatRow[]>();
  for (const it of items) {
    const key = it.eltern_id ?? null;
    (gruppen.get(key) ?? gruppen.set(key, []).get(key)!).push(it);
  }
  const out: KatRow[] = [];
  for (const gr of gruppen.values()) {
    gr.sort((a, b) => (a.sortierung - b.sortierung) || a.name.localeCompare(b.name, "ru"));
    gr.forEach((it, i) => out.push({ ...it, sortierung: i }));
  }
  return out;
}

export function KategorieVerwaltung({ initial, base }: Props) {
  const [items, setItems]   = useState<KatRow[]>(() => normalisiere(initial));
  const [dirty, setDirty]   = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor,  { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const topLevel  = useMemo(
    () => items.filter(i => i.eltern_id == null).sort((a, b) => a.sortierung - b.sortierung),
    [items],
  );
  const kinderVon = useCallback(
    (pid: number) => items.filter(i => i.eltern_id === pid).sort((a, b) => a.sortierung - b.sortierung),
    [items],
  );
  const hatKinder = useCallback((id: number) => items.some(i => i.eltern_id === id), [items]);

  const markDirty = () => { setDirty(true); setSaved(false); };

  // Reihenfolge innerhalb einer Gruppe setzen (orderedIds = neue Reihenfolge)
  const reorder = (eltern_id: number | null, orderedIds: number[]) => {
    setItems(prev => prev.map(it =>
      it.eltern_id === eltern_id && orderedIds.includes(it.id)
        ? { ...it, sortierung: orderedIds.indexOf(it.id) }
        : it,
    ));
    markDirty();
  };

  const move = (id: number, dir: -1 | 1) => {
    const it = items.find(i => i.id === id);
    if (!it) return;
    const sibs = items.filter(i => i.eltern_id === it.eltern_id).sort((a, b) => a.sortierung - b.sortierung);
    const idx  = sibs.findIndex(s => s.id === id);
    const ni   = idx + dir;
    if (ni < 0 || ni >= sibs.length) return;
    reorder(it.eltern_id, arrayMove(sibs.map(s => s.id), idx, ni));
  };

  const setParent = (id: number, eltern_id: number | null) => {
    setItems(prev => normalisiere(
      prev.map(it => it.id === id ? { ...it, eltern_id, sortierung: 99999 } : it),
    ));
    markDirty();
  };

  const toggleAktiv = (id: number) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, aktiv: !it.aktiv } : it));
    markDirty();
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const a = items.find(i => i.id === Number(active.id));
    const o = items.find(i => i.id === Number(over.id));
    if (!a || !o || a.eltern_id !== o.eltern_id) return; // Drag nur innerhalb der Gruppe
    const sibs = items.filter(i => i.eltern_id === a.eltern_id).sort((x, y) => x.sortierung - y.sortierung).map(s => s.id);
    reorder(a.eltern_id, arrayMove(sibs, sibs.indexOf(a.id), sibs.indexOf(o.id)));
  };

  const save = () => {
    setError(null);
    startSave(async () => {
      const res = await kategorienStrukturAction(
        items.map(i => ({ id: i.id, sortierung: i.sortierung, eltern_id: i.eltern_id, aktiv: i.aktiv })),
      );
      if (!res.ok) { setError(res.error ?? "Ошибка сохранения"); return; }
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    });
  };

  // Mögliche Eltern = Top-Level-Kategorien (2 Ebenen). Self ausgeschlossen.
  const elternOptionen = topLevel.map(t => ({ id: t.id, name: t.name }));

  return (
    <div className="space-y-4">
      {/* Sticky Status + Save */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background:    "rgba(253,250,245,0.96)",
          backdropFilter: "blur(8px)",
          border:        "1px solid var(--color-line, #C9B89A)",
          borderRadius:  "var(--radius-card)",
        }}
      >
        <span className="text-xs font-sans flex items-center gap-2">
          {saved ? (
            <span className="flex items-center gap-1.5 text-vintage-sage">
              <CheckCircle2 className="w-4 h-4" /> Сохранено
            </span>
          ) : dirty ? (
            <span className="text-vintage-brown">Есть несохранённые изменения</span>
          ) : (
            <span className="text-vintage-dust italic">
              Перетащите <GripVertical className="inline w-3 h-3" /> или ↑↓ для порядка · выпадающий список — группировка
            </span>
          )}
        </span>
        <Button onClick={save} loading={pending} disabled={!dirty} icon={<Save className="w-3.5 h-3.5" />}>
          Сохранить порядок
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-5 py-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30"
             style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4 text-vintage-burgundy flex-shrink-0 mt-0.5" />
          <p className="text-sm font-sans text-vintage-burgundy">{error}</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-1.5">
          <SortableContext items={topLevel.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {topLevel.map((tl, i) => {
              const kinder = kinderVon(tl.id);
              return (
                <div key={tl.id} className="space-y-1.5">
                  <Zeile
                    kat={tl}
                    elternOptionen={elternOptionen}
                    kannVerschachteln={!hatKinder(tl.id)}
                    canUp={i > 0}
                    canDown={i < topLevel.length - 1}
                    onMove={move}
                    onParent={setParent}
                    onToggle={toggleAktiv}
                    base={base}
                  />
                  {kinder.length > 0 && (
                    <SortableContext items={kinder.map(k => k.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5 pl-7">
                        {kinder.map((k, j) => (
                          <Zeile
                            key={k.id}
                            kat={k}
                            eingerueckt
                            elternOptionen={elternOptionen}
                            kannVerschachteln
                            canUp={j > 0}
                            canDown={j < kinder.length - 1}
                            onMove={move}
                            onParent={setParent}
                            onToggle={toggleAktiv}
                            base={base}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Eine sortierbare Kategorie-Zeile
// ──────────────────────────────────────────────────────────────────────────
interface ZeileProps {
  kat:               KatRow;
  eingerueckt?:      boolean;
  elternOptionen:    { id: number; name: string }[];
  /** false → Kategorie hat eigene Kinder, darf nicht verschachtelt werden (2 Ebenen). */
  kannVerschachteln: boolean;
  canUp:             boolean;
  canDown:           boolean;
  onMove:   (id: number, dir: -1 | 1) => void;
  onParent: (id: number, eltern_id: number | null) => void;
  onToggle: (id: number) => void;
  base:     string;
}

function Zeile({
  kat, eingerueckt, elternOptionen, kannVerschachteln,
  canUp, canDown, onMove, onParent, onToggle, base,
}: ZeileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: kat.id });

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
    zIndex:     isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 bg-vintage-white border ${
        kat.aktiv ? "border-vintage-sand" : "border-vintage-sand/50 opacity-60"
      }`}
    >
      {/* Drag-Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-vintage-dust hover:text-vintage-brown cursor-grab active:cursor-grabbing touch-none shrink-0"
        title="Перетащить"
        aria-label="Перетащить"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Pfeile */}
      <div className="flex flex-col shrink-0">
        <button onClick={() => onMove(kat.id, -1)} disabled={!canUp}
                className="p-0.5 text-vintage-dust hover:text-vintage-brown disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Вверх">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onMove(kat.id, 1)} disabled={!canDown}
                className="p-0.5 text-vintage-dust hover:text-vintage-brown disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Вниз">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {eingerueckt && <CornerDownRight className="w-3.5 h-3.5 text-vintage-dust shrink-0" />}

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-vintage-ink truncate">
          {kat.code && <span className="font-mono text-xs text-vintage-dust mr-1.5">{kat.code}</span>}
          {kat.name}
        </p>
        <p className="text-[11px] text-vintage-dust font-mono truncate">
          /{kat.slug} · {kat.anzahl} тов.
        </p>
      </div>

      {/* Parent-Dropdown (Gruppierung) */}
      <select
        value={kat.eltern_id ?? ""}
        disabled={!kannVerschachteln}
        onChange={(e) => onParent(kat.id, e.target.value ? Number(e.target.value) : null)}
        className="shrink-0 text-xs font-sans bg-vintage-parchment border border-vintage-sand px-2 py-1 max-w-[150px] disabled:opacity-40"
        style={{ borderRadius: "var(--radius-vintage)" }}
        title={kannVerschachteln ? "Родительская категория" : "Есть подкатегории — нельзя вложить"}
      >
        <option value="">— Верхний уровень —</option>
        {elternOptionen.filter(o => o.id !== kat.id).map(o => (
          <option key={o.id} value={o.id}>↳ {o.name}</option>
        ))}
      </select>

      {/* Aktiv-Toggle */}
      <label className="flex items-center gap-1.5 shrink-0 cursor-pointer text-[11px] font-sans text-vintage-dust">
        <input
          type="checkbox"
          checked={kat.aktiv}
          onChange={() => onToggle(kat.id)}
          className="w-3.5 h-3.5 accent-vintage-sage"
        />
        <span className="hidden sm:inline">Активна</span>
      </label>

      {/* Edit-Link */}
      <Link
        href={`${base}/kategorien/${kat.id}`}
        className="p-1.5 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment shrink-0"
        style={{ borderRadius: "var(--radius-vintage)" }}
        title="Изменить"
      >
        <Pencil className="w-4 h-4" />
      </Link>
    </div>
  );
}
