import { alleSegments, alleStages, segmentVorschau } from "@/lib/db/crm";
import { SegmentNeuFormular } from "./segment-neu-formular";
import { SegmentZeile } from "./segment-zeile";
import { Filter } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Сегменты" };
export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const [segments, stages] = await Promise.all([alleSegments(), alleStages()]);

  // Treffer pro Segment berechnen (parallel)
  const segmentsMitTreffer = await Promise.all(
    segments.map(async (s) => {
      const r = await segmentVorschau(s.filter, 1).catch(() => ({ treffer: 0 }));
      return { ...s, treffer: r.treffer };
    })
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Filter className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Сегменты</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Сохранённые фильтры для работы с аудиториями · {segments.length} сегментов
          </p>
        </div>
      </div>

      <SegmentNeuFormular stages={stages} />

      {segmentsMitTreffer.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Filter className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Сегментов пока нет</p>
          <p className="text-xs text-vintage-dust font-sans mt-1">Создайте первый сегмент выше.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {segmentsMitTreffer.map(s => <SegmentZeile key={s.id} segment={s} />)}
        </div>
      )}
    </div>
  );
}
