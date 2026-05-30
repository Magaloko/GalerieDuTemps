import { alleStages, pipelineMitKunden } from "@/lib/db/crm";
import { KanbanBoard } from "./kanban-board";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CRM Воронка" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [stages, kunden] = await Promise.all([
    alleStages(),
    pipelineMitKunden(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
        <div>
          <p className="eyebrow">✦ CRM</p>
          <h1 className="list-title">Воронка</h1>
          <p className="list-sub">
            {kunden.length} клиентов · {stages.length} этапов · перетащите карточку
          </p>
        </div>
      </div>

      <KanbanBoard stages={stages} kunden={kunden} />
    </div>
  );
}
