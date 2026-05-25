import { alleDripFlows } from "@/lib/db/crm";
import { FlowNeuFormular } from "./flow-neu-formular";
import { FlowZeile } from "./flow-zeile";
import { Workflow, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Drip-Flows" };
export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const flows = await alleDripFlows();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Drip-Flows</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">Automatisierte Mail-Sequenzen · {flows.length} Flows</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-vintage-gold/10 border border-vintage-gold/30 text-vintage-brown text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
        <Info className="w-4 h-4 text-vintage-gold flex-shrink-0 mt-0.5" />
        <div>
          <strong>Drip-Engine in Phase 10k:</strong> Diese Übersicht erlaubt das Anlegen
          von Flow-Definitionen. Die eigentliche Versand-Schleife (Cron-Job, der naechster_lauf
          prüft) wird in Phase 10k zusammen mit anderen Crons implementiert. Schritte werden
          über die DB-Tabelle <code>sebo.drip_flow_steps</code> eingepflegt.
        </div>
      </div>

      <FlowNeuFormular />

      {flows.length === 0 ? (
        <div className="text-center py-12 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Workflow className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
          <p className="font-serif text-vintage-brown">Keine Flows</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flows.map(f => <FlowZeile key={f.id} flow={f} />)}
        </div>
      )}
    </div>
  );
}
