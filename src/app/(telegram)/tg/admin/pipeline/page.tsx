import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminNotAllowed, AdminEmpty } from "../_ui";
import { alleStages, pipelineMitKunden } from "@/lib/db/crm";
import { PipelineBoard } from "./pipeline-board";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Воронка · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/admin/pipeline — CRM-Voronka in der Mini-App (Muster aus ZENA-v3-Kanban).
 *
 * Spalten = pipeline_stages, Karten = Kunden. Verschieben per ◀▶ (touch-sicher
 * statt Drag — auf der schmalen WebView zuverlässiger). Karte → Kunden-Akte.
 * Liegt auf vorhandenen sebo-Tabellen (pipeline_stages + customers).
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgAdminPipeline() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const [stages, kunden] = await Promise.all([
    alleStages().catch(() => []),
    pipelineMitKunden().catch(() => []),
  ]);

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-10">
        <AdminBack />
        <AdminHeader eyebrow="✦ CRM" titel="Воронка" sub={`${kunden.length} клиентов · ${stages.length} этапов`} />
        {stages.length === 0 ? (
          <AdminEmpty text="Этапы не настроены." />
        ) : (
          <PipelineBoard
            stages={stages.map(s => ({ id: s.id, name: s.name, farbe: s.farbe }))}
            kunden={kunden.map(k => ({
              customer_id:   k.customer_id,
              customer_name: k.customer_name,
              customer_type: k.customer_type,
              stage_id:      k.stage_id,
            }))}
          />
        )}
      </main>
    </TelegramAuthGate>
  );
}
