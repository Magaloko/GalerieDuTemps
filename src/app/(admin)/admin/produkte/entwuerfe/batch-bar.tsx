"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Rocket, Loader2 } from "lucide-react";
import { entwurfKiFuellenAction, entwuerfeBatchVeroeffentlichenAction } from "@/app/(admin)/admin/produkte/actions";

/* Stapel-Aktionen über alle Entwürfe: KI-Ausfüllen (sequenziell, mit
 * Fortschritt) + alle mit Preis veröffentlichen (eine Server-Action). */
export function BatchBar({ kiIds }: { kiIds: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  const kiAlle = () => {
    if (kiIds.length === 0) return;
    if (!confirm(`Запустить ИИ для ${kiIds.length} черновик(ов)? Это расходует токены.`)) return;
    start(async () => {
      let done = 0, err = 0;
      for (const id of kiIds) {
        const r = await entwurfKiFuellenAction(id);
        r.ok ? done++ : err++;
        setProgress(`ИИ: ${done + err}/${kiIds.length}`);
      }
      setProgress(`Готово: ${done} заполнено${err ? `, ${err} с ошибкой` : ""}`);
      router.refresh();
      setTimeout(() => setProgress(null), 4000);
    });
  };

  const publishAlle = () => {
    if (!confirm("Опубликовать ВСЕ черновики с указанной ценой?")) return;
    start(async () => {
      setProgress("Публикуем…");
      const r = await entwuerfeBatchVeroeffentlichenAction();
      setProgress(r.ok ? `Опубликовано: ${r.veroeffentlicht} · без цены: ${r.uebersprungen}` : (r.error ?? "Ошибка"));
      router.refresh();
      setTimeout(() => setProgress(null), 4000);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-vintage-parchment border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
      <span className="text-xs uppercase tracking-widest text-vintage-dust mr-1">Пачкой:</span>
      <button type="button" onClick={kiAlle} disabled={pending || kiIds.length === 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/10 transition-colors disabled:opacity-40"
        style={{ borderRadius: "var(--radius-vintage)" }}>
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        ИИ для всех{kiIds.length ? ` (${kiIds.length})` : ""}
      </button>
      <button type="button" onClick={publishAlle} disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium disabled:opacity-40"
        style={{ background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-vintage)" }}>
        <Rocket className="w-3.5 h-3.5" /> Опубликовать все с ценой
      </button>
      {progress && <span className="text-xs text-vintage-ink">{progress}</span>}
    </div>
  );
}
