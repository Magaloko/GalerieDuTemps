import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { produkteListe } from "@/lib/db/produkte";
import { ProduktRow } from "./produkt-row";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Товары · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type StatusFilter = "aktiv" | "entwurf" | "verkauft" | "reserviert";
const STATUS_CHIPS: { value: StatusFilter | ""; label: string }[] = [
  { value: "",            label: "Все" },
  { value: "aktiv",       label: "Активные" },
  { value: "entwurf",     label: "Черновики" },
  { value: "reserviert",  label: "Бронь" },
  { value: "verkauft",    label: "Проданные" },
];

/* /tg/admin/produkte — Produkt-Liste mit Suche, Status-Filter + Inline-Actions. */
export default async function TgAdminProdukte({
  searchParams,
}: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }

  const sp = await searchParams;
  const status = (["aktiv", "entwurf", "verkauft", "reserviert"].includes(sp.status ?? "")
    ? sp.status
    : undefined) as StatusFilter | undefined;

  const { items } = await produkteListe({ seite: 1, limit: 30, suche: sp.q, status }).catch(() => ({ items: [] as Awaited<ReturnType<typeof produkteListe>>["items"] }));

  // Filter-Chip-Links bauen (Suche beibehalten).
  const chipHref = (s: StatusFilter | "") => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (s)    params.set("status", s);
    const qs = params.toString();
    return qs ? `/tg/admin/produkte?${qs}` : "/tg/admin/produkte";
  };

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Каталог" titel="Товары" sub={`${items.length} показано`} />

        {/* Suche (Status bleibt via hidden erhalten) */}
        <form action="/tg/admin/produkte" method="get" className="mb-3">
          {status && <input type="hidden" name="status" value={status} />}
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

        {/* Status-Filter-Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {STATUS_CHIPS.map(c => {
            const aktiv = (status ?? "") === c.value;
            return (
              <Link
                key={c.value || "all"}
                href={chipHref(c.value)}
                className="shrink-0 px-3 py-1.5 text-[11px] uppercase font-medium whitespace-nowrap"
                style={{
                  letterSpacing: "0.12em",
                  borderRadius:  999,
                  touchAction:   "manipulation",
                  background:    aktiv ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, #fff)",
                  color:         aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                  border:        `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
                }}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

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
                reserviert={p.reserviert ?? false}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
