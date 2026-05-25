import { alleStages, pipelineMitKunden } from "@/lib/db/crm";
import { KanbanBoard } from "./kanban-board";
import { Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "CRM Pipeline" };
export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [stages, kunden] = await Promise.all([
    alleStages(),
    pipelineMitKunden(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Pipeline</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            {kunden.length} Kund:innen · {stages.length} Stages · Drag-and-Drop zum Verschieben
          </p>
        </div>
      </div>

      <KanbanBoard stages={stages} kunden={kunden} />
    </div>
  );
}
