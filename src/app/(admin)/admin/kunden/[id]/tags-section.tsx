"use client";

import { useState, useTransition } from "react";
import { Tag as TagIcon, X, Plus } from "lucide-react";
import { tagAssignAction, tagRemoveAction, tagCreateAction } from "./actions";
import type { Tag } from "@/types/crm";

export function TagsSection({
  customerId, alleTags, kundenTags,
}: { customerId: string; alleTags: Tag[]; kundenTags: Tag[] }) {
  const [pending, startTransition] = useTransition();
  const [picker, setPicker]    = useState(false);
  const [neuName, setNeuName]  = useState("");
  const [neuFarbe, setNeuFarbe]= useState("#C9A84C");

  const assignedIds = new Set(kundenTags.map(t => t.id));
  const verfuegbar  = alleTags.filter(t => !assignedIds.has(t.id));

  const handleAdd = (tagId: number) => {
    startTransition(() => tagAssignAction(customerId, tagId));
    setPicker(false);
  };

  const handleRemove = (tagId: number) => {
    startTransition(() => tagRemoveAction(customerId, tagId));
  };

  const handleCreate = async () => {
    if (!neuName.trim()) return;
    startTransition(async () => {
      const result = await tagCreateAction(neuName, neuFarbe);
      if (result.ok) setNeuName("");
    });
  };

  return (
    <section className="record-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="record-section-title">
          <TagIcon className="w-4 h-4" /> Теги
        </h2>
        <button
          onClick={() => setPicker(p => !p)}
          className="btn-line flex items-center gap-1"
          style={{ padding: "0.375rem 0.75rem" }}
        >
          <Plus className="w-3 h-3" /> Добавить тег
        </button>
      </div>

      {/* Aktive Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
        {kundenTags.length === 0 && !pending ? (
          <p className="text-xs font-sans italic" style={{ color: "var(--color-ink-mute)" }}>тегов нет</p>
        ) : kundenTags.map(t => (
          <span key={t.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-sans border"
            style={{ background: t.farbe + "15", borderColor: t.farbe + "60", color: t.farbe, borderRadius: "var(--radius-vintage)" }}>
            {t.name}
            <button onClick={() => handleRemove(t.id)} className="ml-0.5 hover:scale-110 transition-transform">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Tag-Picker */}
      {picker && (
        <div className="pt-3 space-y-3" style={{ borderTop: "1px solid var(--color-line)" }}>
          {verfuegbar.length > 0 && (
            <div>
              <p className="text-xs font-sans mb-1.5" style={{ color: "var(--color-ink-mute)" }}>Доступно:</p>
              <div className="flex flex-wrap gap-1.5">
                {verfuegbar.map(t => (
                  <button key={t.id} onClick={() => handleAdd(t.id)}
                    className="px-2 py-0.5 text-xs font-sans border hover:scale-105 transition-transform"
                    style={{ background: t.farbe + "15", borderColor: t.farbe + "60", color: t.farbe, borderRadius: "var(--radius-vintage)" }}>
                    + {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Neuen Tag erstellen */}
          <div>
            <p className="text-xs font-sans mb-1.5" style={{ color: "var(--color-ink-mute)" }}>Новый тег:</p>
            <div className="flex gap-2">
              <input
                value={neuName}
                onChange={(e) => setNeuName(e.target.value)}
                placeholder="Название тега"
                className="field-input flex-1"
                style={{ padding: "0.375rem 0.75rem" }}
              />
              <input
                type="color"
                value={neuFarbe}
                onChange={(e) => setNeuFarbe(e.target.value)}
                className="w-10 h-9 cursor-pointer"
                style={{ border: "1px solid var(--color-line)", borderRadius: "var(--radius-vintage)" }}
              />
              <button
                onClick={handleCreate}
                disabled={!neuName.trim() || pending}
                className="btn-coral btn-coral-sm disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
