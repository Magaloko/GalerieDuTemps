"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";
import { moduleSpeichernAction, type ToggleResult } from "./actions";
import type { FeatureKey } from "@/lib/db/feature-flags";

interface Props {
  initialFlags: Record<FeatureKey, boolean>;
  keys:         readonly FeatureKey[];
  catalog:      Record<FeatureKey, { label: string; desc: string }>;
}

export function ModuleFormular({ initialFlags, keys, catalog }: Props) {
  const [state, formAction, isPending] = useActionState<ToggleResult | null, FormData>(
    moduleSpeichernAction,
    null,
  );
  // Optimistic UI: Toggle reagiert sofort, Bulk-Save bestätigt
  const [flags, setFlags] = useState<Record<FeatureKey, boolean>>(initialFlags);

  // Dirty-Check: enabled Save-Button nur wenn was geändert wurde
  const dirty = keys.some(k => flags[k] !== initialFlags[k]);

  return (
    <form action={formAction} className="space-y-4">
      {/* Feedback */}
      {state?.ok === true && (
        <div
          className="flex items-center gap-3 p-4 text-sm font-sans"
          style={{
            background:   "rgba(127,140,90,0.10)",
            border:       "1px solid rgba(127,140,90,0.30)",
            color:        "#52663F",
            borderRadius: "var(--radius-card)",
          }}
        >
          <CheckCircle2 className="w-4 h-4" /> Сохранено.
        </div>
      )}
      {state?.ok === false && (
        <div
          className="flex items-center gap-3 p-4 text-sm font-sans"
          style={{
            background:   "rgba(232,112,58,0.10)",
            border:       "1px solid rgba(232,112,58,0.40)",
            color:        "#A53E26",
            borderRadius: "var(--radius-card)",
          }}
        >
          <AlertCircle className="w-4 h-4" /> {state.fehler}
        </div>
      )}

      {/* Module-Liste */}
      <div className="space-y-2">
        {keys.map(key => {
          const meta    = catalog[key];
          const enabled = flags[key];
          return (
            <label
              key={key}
              className="flex items-start gap-4 p-5 cursor-pointer transition-colors hover:bg-vintage-sand/20"
              style={{
                background:   "#fff",
                border:       "1px solid var(--color-line)",
                borderLeft:   `4px solid ${enabled ? "var(--color-sage, #7F8C5A)" : "var(--color-line)"}`,
                borderRadius: "var(--radius-card)",
              }}
            >
              {/* Toggle-Switch */}
              <div className="shrink-0 mt-1 relative">
                <input
                  type="checkbox"
                  name={key}
                  checked={enabled}
                  onChange={e => setFlags(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div
                  className="w-10 h-6 rounded-full transition-colors"
                  style={{
                    background: enabled ? "var(--color-sage, #7F8C5A)" : "#D6CFC0",
                  }}
                />
                <div
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    transform: enabled ? "translateX(16px)" : "translateX(0)",
                  }}
                />
              </div>

              {/* Inhalt */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="font-serif text-base text-vintage-espresso">{meta.label}</h3>
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest"
                    style={{ color: enabled ? "var(--color-sage, #7F8C5A)" : "var(--color-ink-mute, #9B9B9B)" }}
                  >
                    {enabled ? "ВКЛ" : "ВЫКЛ"}
                  </span>
                </div>
                <p className="text-xs text-vintage-dust font-sans mt-1">{meta.desc}</p>
                <p className="text-[10px] text-vintage-dust font-mono mt-1 opacity-60">
                  key: {key}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Save-Button */}
      <div className="flex justify-end items-center gap-3 pt-2">
        {dirty && (
          <span className="text-xs text-vintage-dust font-sans">
            Есть несохранённые изменения
          </span>
        )}
        <Button
          type="submit"
          loading={isPending}
          disabled={!dirty}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Сохранить
        </Button>
      </div>
    </form>
  );
}
