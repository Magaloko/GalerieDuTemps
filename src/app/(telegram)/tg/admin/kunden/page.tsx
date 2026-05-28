import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminListRow, AdminNotAllowed } from "../_ui";
import { customersListe } from "@/lib/db/customers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Клиенты · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TYP_BADGE: Record<string, { text: string; color: string }> = {
  b2c:          { text: "B2C",  color: "var(--color-ink-mute)" },
  b2b_pending:  { text: "B2B?", color: "#C9A84C" },
  b2b_verified: { text: "B2B",  color: "#52663F" },
  b2b_rejected: { text: "B2B✕", color: "var(--color-coral-deep, #A53E26)" },
};

export default async function TgAdminKunden({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const sp = await searchParams;
  const { items, gesamt } = await customersListe({ seite: 1, limit: 30, suche: sp.q })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof customersListe>>["items"], gesamt: 0 }));

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Клиенты" titel="Клиенты" sub={`всего ${gesamt}`} />

        <form action="/tg/admin/kunden" method="get" className="mb-4">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Имя / e-mail / компания…"
            className="w-full px-3 py-2.5 text-sm"
            style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
          />
        </form>

        {items.length === 0 ? (
          <AdminEmpty text="Клиенты не найдены." />
        ) : (
          <div className="space-y-2">
            {items.map(c => (
              <AdminListRow
                key={c.id}
                href={`/admin/kunden/${c.id}`}
                title={[c.vorname, c.nachname].filter(Boolean).join(" ") || c.email || c.telegram_username || "Гость"}
                sub={`${c.email ?? (c.telegram_username ? `@${c.telegram_username}` : "Telegram")}${c.company_name ? ` · ${c.company_name}` : ""}`}
                badge={TYP_BADGE[c.customer_type] ?? null}
              />
            ))}
          </div>
        )}
        <p className="text-[10px] text-center mt-4" style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          Карточка клиента откроется на сайте (↗).
        </p>
      </main>
    </TelegramAuthGate>
  );
}
