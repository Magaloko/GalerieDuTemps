"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { kundeStageVerschiebenTgAction } from "../actions";
import { haptic } from "../../fx";

type Stage = { id: number; name: string; farbe: string };
type Kunde = { customer_id: string; customer_name: string; customer_type: string; stage_id: number };

const TYP_KURZ: Record<string, string> = {
  b2c: "B2C", b2b_pending: "B2B?", b2b_verified: "B2B", b2b_rejected: "B2B✕",
};

/* ──────────────────────────────────────────────────────────────────────────
 * PipelineBoard — Spalten je Stage, Karten je Kunde. Verschieben per ◀▶
 * (optimistisch + persistiert). Touch-sicher (kein Drag-Gesten-Konflikt mit
 * dem horizontalen Scroll der WebView). Karte → Kunden-Akte.
 * ────────────────────────────────────────────────────────────────────────── */
export function PipelineBoard({ stages, kunden: initial }: { stages: Stage[]; kunden: Kunde[] }) {
  const router = useRouter();
  const [kunden, setKunden] = useState<Kunde[]>(initial);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const stageIndex = (id: number) => stages.findIndex(s => s.id === id);

  const move = (k: Kunde, dir: -1 | 1) => {
    const cur = stageIndex(k.stage_id);
    const next = cur + dir;
    if (cur < 0 || next < 0 || next >= stages.length) return;
    const ziel = stages[next].id;
    setBusy(k.customer_id);
    setKunden(prev => prev.map(x => x.customer_id === k.customer_id ? { ...x, stage_id: ziel } : x));
    haptic("light");
    start(async () => {
      const r = await kundeStageVerschiebenTgAction(k.customer_id, ziel);
      setBusy(null);
      if (r.ok) { haptic("success"); router.refresh(); }
      else { haptic("error"); router.refresh(); }  // refresh → Server-Wahrheit (Rollback)
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {stages.map((stage, sIdx) => {
        const inStage = kunden.filter(k => k.stage_id === stage.id);
        return (
          <div key={stage.id} className="shrink-0 flex flex-col" style={{ width: 220 }}>
            {/* Spalten-Kopf */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.farbe || "var(--color-coral)" }} />
              <span className="text-[11px] uppercase font-medium flex-1 truncate"
                style={{ letterSpacing: "0.14em", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                {stage.name}
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                {inStage.length}
              </span>
            </div>

            {/* Karten */}
            <div className="flex flex-col gap-2">
              {inStage.length === 0 ? (
                <p className="text-[11px] px-1 py-3 text-center" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>—</p>
              ) : inStage.map(k => (
                <div key={k.customer_id}
                  style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", borderRadius: 8, opacity: busy === k.customer_id ? 0.5 : 1 }}>
                  <Link href={`/tg/admin/kunden/${k.customer_id}`} className="block px-2.5 pt-2.5 pb-1.5">
                    <p className="text-[13px] truncate" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                      {k.customer_name}
                    </p>
                    <span className="text-[9px] uppercase" style={{ letterSpacing: "0.12em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                      {TYP_KURZ[k.customer_type] ?? k.customer_type}
                    </span>
                  </Link>
                  {/* Verschieben ◀ ▶ */}
                  <div className="flex items-stretch border-t" style={{ borderColor: "var(--color-line)" }}>
                    <button type="button" disabled={sIdx === 0 || busy === k.customer_id} onClick={() => move(k, -1)}
                      className="flex-1 flex items-center justify-center py-1.5 disabled:opacity-25"
                      style={{ touchAction: "manipulation" }} aria-label="Назад">
                      <ChevronLeft className="w-3.5 h-3.5" style={{ color: "var(--color-ink-mute)" }} />
                    </button>
                    <span className="w-px" style={{ background: "var(--color-line)" }} />
                    <button type="button" disabled={sIdx === stages.length - 1 || busy === k.customer_id} onClick={() => move(k, 1)}
                      className="flex-1 flex items-center justify-center py-1.5 disabled:opacity-25"
                      style={{ touchAction: "manipulation" }} aria-label="Вперёд">
                      {busy === k.customer_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--color-coral)" }} />
                        : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--color-ink-mute)" }} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
