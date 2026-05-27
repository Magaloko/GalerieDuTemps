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
    <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
        <StickyNote className="w-4 h-4 text-vintage-gold" /> Заметки ({notes.length})
      </h2>

      {/* Neue Notiz */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          placeholder="Добавить новую заметку..."
          rows={2}
          className="flex-1 px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown resize-none"
          style={{ borderRadius: "var(--radius-vintage)" }}
        />
        <button
          onClick={handleAdd}
          disabled={!inhalt.trim() || pending}
          className="px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50 self-start"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Сохранить
        </button>
      </div>

      {/* Liste */}
      {notes.length === 0 ? (
        <p className="text-xs text-vintage-dust font-sans text-center py-4 italic">Заметок пока нет</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id}
              className={`p-3 border ${n.pinned ? "bg-vintage-gold/5 border-vintage-gold/30" : "bg-vintage-parchment border-vintage-sand"}`}
              style={{ borderRadius: "var(--radius-vintage)" }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-sans text-vintage-ink whitespace-pre-line flex-1">{n.inhalt}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startTransition(() => notePinAction(n.id, customerId, !n.pinned))}
                    className="p-1 text-vintage-dust hover:text-vintage-gold transition-colors">
                    {n.pinned ? <Pin className="w-3.5 h-3.5 fill-vintage-gold text-vintage-gold" /> : <PinOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => {
                    if (confirm("Удалить?")) startTransition(() => noteDeleteAction(n.id, customerId));
                  }} className="p-1 text-vintage-dust hover:text-vintage-burgundy transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-vintage-dust font-sans mt-1">
                {n.erstellt_von_name ?? "Система"} · {new Date(n.erstellt_am).toLocaleString("ru-RU")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
