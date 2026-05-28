import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { alleKategorienAdmin } from "@/lib/db/kategorien";
import { KategorieCreate } from "./kategorie-create";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Категории · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminKategorien() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const kats = await alleKategorienAdmin().catch(() => []);

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Каталог" titel="Категории" sub={`${kats.length} всего`} />

        <KategorieCreate
          parents={kats.filter(k => k.eltern_id == null).map(k => ({ id: k.id, name: k.name }))}
        />

        <div className="mt-4 space-y-2">
          {kats.length === 0 ? (
            <AdminEmpty text="Категорий пока нет." />
          ) : kats.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3"
                 style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)",
                          paddingLeft: k.eltern_id != null ? 28 : 12 }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                  {k.eltern_id != null ? "↳ " : ""}{k.name}
                </p>
                <p className="text-[11px] font-mono" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                  /{k.slug}{k.anzahl != null ? ` · ${k.anzahl} тов.` : ""}
                </p>
              </div>
              {!k.aktiv && <span className="text-[9px] uppercase px-1.5 py-0.5" style={{ background: "#8884", color: "var(--color-ink-mute)" }}>скрыта</span>}
            </div>
          ))}
        </div>
      </main>
    </TelegramAuthGate>
  );
}
