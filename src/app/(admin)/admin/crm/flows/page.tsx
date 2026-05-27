import { alleDripFlows } from "@/lib/db/crm";
import { FlowNeuFormular } from "./flow-neu-formular";
import { FlowZeile } from "./flow-zeile";
import { Workflow, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Авто-цепочки" };
export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const flows = await alleDripFlows();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Авто-цепочки</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">Автоматические почтовые серии · {flows.length} цепочек</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
        <Info className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
        <div>
          <strong>Drip-Engine в фазе 10k:</strong> этот раздел позволяет создавать
          определения цепочек. Фактический цикл отправки (Cron-задача, проверяющая naechster_lauf)
          будет реализован в фазе 10k вместе с другими Cron-задачами. Шаги добавляются
          через таблицу БД <code>sebo.drip_flow_steps</code>.
        </div>
      </div>

      <FlowNeuFormular />

      {flows.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Workflow className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Цепочек пока нет</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map(f => <FlowZeile key={f.id} flow={f} />)}
        </div>
      )}
    </div>
  );
}
