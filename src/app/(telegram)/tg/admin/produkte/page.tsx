import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { produkteListe } from "@/lib/db/produkte";
import { ProduktRow } from "./produkt-row";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Товары · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* /tg/admin/produkte — Produkt-Liste mit Inline-Preis/Publish-Actions. */
export default async function TgAdminProdukte({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const sp = await searchParams;
  const { items } = await produkteListe({ seite: 1, limit: 30, suche: sp.q }).catch(() => ({ items: [] as Awaited<ReturnType<typeof produkteListe>>["items"] }));

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Каталог" titel="Товары" sub={`${items.length} показано · черновики и активные`} />

        {/* Suche */}
        <form action="/tg/admin/produkte" method="get" className="mb-4">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Поиск по названию / коду…"
            className="w-full px-3 py-2.5 text-sm"
            style={{
              background: "var(--color-bone)",
              border:     "1px solid var(--color-line)",
              color:      "var(--tg-theme-text-color, var(--color-ink))",
            }}
          />
        </form>

        {items.length === 0 ? (
          <AdminEmpty text="Ничего не найдено." />
        ) : (
          <div className="space-y-2">
            {items.map(p => (
              <ProduktRow
                key={p.id}
                id={p.id}
                name={p.name}
                artikelCode={p.artikel_code}
                preis={Number(p.preis)}
                aktiv={p.aktiv}
                lagerbestand={p.lagerbestand}
                bildUrl={p.hauptbild_url}
                verkauft={p.verkauft}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
