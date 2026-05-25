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
    <section className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-vintage-gold" /> Tags
        </h2>
        <button
          onClick={() => setPicker(p => !p)}
          className="px-3 py-1.5 text-xs font-sans uppercase tracking-widest text-vintage-brown border border-vintage-sand hover:bg-vintage-parchment transition-colors flex items-center gap-1"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          <Plus className="w-3 h-3" /> Tag hinzufügen
        </button>
      </div>

      {/* Aktive Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
        {kundenTags.length === 0 && !pending ? (
          <p className="text-xs text-vintage-dust font-sans italic">keine Tags</p>
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
        <div className="border-t border-vintage-sand pt-3 space-y-3">
          {verfuegbar.length > 0 && (
            <div>
              <p className="text-xs font-sans text-vintage-dust mb-1.5">Verfügbar:</p>
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
            <p className="text-xs font-sans text-vintage-dust mb-1.5">Neuer Tag:</p>
            <div className="flex gap-2">
              <input
                value={neuName}
                onChange={(e) => setNeuName(e.target.value)}
                placeholder="Tag-Name"
                className="flex-1 px-3 py-1.5 bg-vintage-cream border border-vintage-sand text-sm font-sans focus:outline-none focus:border-vintage-brown"
                style={{ borderRadius: "var(--radius-vintage)" }}
              />
              <input
                type="color"
                value={neuFarbe}
                onChange={(e) => setNeuFarbe(e.target.value)}
                className="w-10 h-9 border border-vintage-sand cursor-pointer"
                style={{ borderRadius: "var(--radius-vintage)" }}
              />
              <button
                onClick={handleCreate}
                disabled={!neuName.trim() || pending}
                className="px-3 py-1.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
