import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../../auth-gate";
import { AdminBack, AdminNotAllowed } from "../../_ui";
import { produktById } from "@/lib/db/produkte";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { ProduktEditor } from "./editor-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Редактор товара", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminProduktEdit({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const { id } = await params;

  const [p, bilder, kategorien] = await Promise.all([
    produktById(id),
    bilderFuerProdukt(id).catch(() => []),
    alleKategorienAdmin().catch(() => []),
  ]);

  if (!p) {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>Товар не найден</p>
          <AdminBack href="/tg/admin/produkte" label="Товары" />
        </main>
      </TelegramAuthGate>
    );
  }

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-10">
        <AdminBack href="/tg/admin/produkte" label="Товары" />
        <ProduktEditor
          produkt={{
            id:               p.id,
            name:             p.name,
            artikel_code:     p.artikel_code,
            preis:            Number(p.preis),
            originalpreis:    p.originalpreis != null ? Number(p.originalpreis) : null,
            kurzbeschreibung: p.kurzbeschreibung,
            beschreibung:     p.beschreibung,
            kategorie_id:     p.kategorie_id,
            zustand:          p.zustand,
            era:              p.era,
            material:         p.material,
            herkunft:         p.herkunft,
            lagerbestand:     p.lagerbestand,
            featured:         p.featured,
            aktiv:            p.aktiv,
            b2c_mode:         p.b2c_mode,
            tags:             Array.isArray(p.tags) ? p.tags : [],
          }}
          bilder={bilder.map(b => ({ id: b.id, url: b.url_thumb ?? b.url, urlFull: b.url, ist_hauptbild: b.ist_hauptbild }))}
          kategorien={kategorien.map(k => ({ id: k.id, name: k.name }))}
        />
      </main>
    </TelegramAuthGate>
  );
}
