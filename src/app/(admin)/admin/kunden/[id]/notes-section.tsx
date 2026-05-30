"use client";

import { useState, useTransition } from "react";
import { StickyNote, Pin, PinOff, Trash2 } from "lucide-react";
import { noteCreateAction, notePinAction, noteDeleteAction } from "./actions";
import type { Note } from "@/types/crm";

export function NotesSection({ customerId, notes }: { customerId: string; notes: Note[] }) {
  const [inhalt, setInhalt]    = useState("");
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!inhalt.trim()) return;
    startTransition(() => noteCreateAction(customerId, inhalt));
    setInhalt("");
  };

  return (
    <section className="record-card">
      <h2 className="record-section-title mb-4">
        <StickyNote className="w-4 h-4" /> Заметки ({notes.length})
      </h2>

      {/* Neue Notiz */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          placeholder="Добавить новую заметку..."
          rows={2}
          className="field-input resize-none"
          style={{ padding: "0.5rem 0.75rem" }}
        />
        <button
          onClick={handleAdd}
          disabled={!inhalt.trim() || pending}
          className="btn-coral btn-coral-sm disabled:opacity-50 self-start"
        >
          Сохранить
        </button>
      </div>

      {/* Liste */}
      {notes.length === 0 ? (
        <p className="text-xs font-sans text-center py-4 italic" style={{ color: "var(--color-ink-mute)" }}>Заметок пока нет</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id}
              className="p-3"
              style={{ border: "1px solid var(--color-line)", background: n.pinned ? "rgba(232,112,58,0.06)" : "var(--color-paper-warm)", borderColor: n.pinned ? "rgba(232,112,58,0.30)" : "var(--color-line)", borderRadius: "var(--radius-vintage)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-sans whitespace-pre-line flex-1" style={{ color: "var(--color-ink)" }}>{n.inhalt}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startTransition(() => notePinAction(n.id, customerId, !n.pinned))}
                    className="p-1 transition-colors" style={{ color: n.pinned ? "var(--color-coral)" : "var(--color-ink-mute)" }} aria-label="Закрепить">
                    {n.pinned ? <Pin className="w-3.5 h-3.5" style={{ fill: "var(--color-coral)" }} /> : <PinOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => {
                    if (confirm("Удалить?")) startTransition(() => noteDeleteAction(n.id, customerId));
                  }} className="p-1 transition-colors" style={{ color: "var(--color-ink-mute)" }} aria-label="Удалить">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] font-sans mt-1" style={{ color: "var(--color-ink-mute)" }}>
                {n.erstellt_von_name ?? "Система"} · {new Date(n.erstellt_am).toLocaleString("ru-RU")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
