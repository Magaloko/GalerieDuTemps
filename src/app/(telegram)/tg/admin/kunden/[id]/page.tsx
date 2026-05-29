import Link from "next/link";
import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../../auth-gate";
import { AdminBack, AdminNotAllowed } from "../../_ui";
import { customerById } from "@/lib/db/customers";
import { ordersFuerCustomer } from "@/lib/db/orders";
import { customerTimeline } from "@/lib/db/leads";
import { formatPreis } from "@/lib/utils/preis";
import {
  Phone, MessageCircle, Send, Mail, ShoppingBag, Inbox, Activity, CheckSquare, StickyNote, Package,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Клиент · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * Kunden-Akte (360°) — portiert als Muster aus ZENA-Admin v3.
 *
 * Eine Ansicht für alles zum Kunden: Kontakt + Quick-Actions (Anrufen/
 * WhatsApp/Telegram/Mail), Kennzahlen (Bestellungen, LTV, AOV), Bestell-
 * historie und Aktivitäts-Timeline (Events/Leads/Tasks/Notizen). Liegt auf
 * vorhandenen sebo-Tabellen (customers/orders/crm_events/leads/tasks/notes).
 * ────────────────────────────────────────────────────────────────────────── */

const TYP_LABEL: Record<string, string> = {
  b2c: "Частный", b2b_pending: "B2B · ожидает", b2b_verified: "B2B", b2b_rejected: "B2B · отклонён",
};
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Ожидает оплаты", color: "#9A7B1F" },
  paid:      { label: "Оплачен",        color: "#52663F" },
  fulfilled: { label: "Выполнен",       color: "#52663F" },
  completed: { label: "Завершён",       color: "#52663F" },
  cancelled: { label: "Отменён",        color: "var(--color-ink-mute)" },
  refunded:  { label: "Возврат",        color: "var(--color-coral-deep, #A53E26)" },
};
const TL_ICON: Record<string, React.ElementType> = {
  order: ShoppingBag, lead: Inbox, event: Activity, task: CheckSquare, note: StickyNote,
};

function datum(ts: string): string {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TgAdminKundenAkte({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const { id } = await params;
  const customer = await customerById(id);
  if (!customer) {
    return (
      <TelegramAuthGate>
        <main className="p-6 text-center min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <p style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--color-ink)" }}>Клиент не найден</p>
          <AdminBack href="/tg/admin/kunden" label="Клиенты" />
        </main>
      </TelegramAuthGate>
    );
  }

  const [orders, timeline] = await Promise.all([
    ordersFuerCustomer(id).catch(() => []),
    customerTimeline(id, 40).catch(() => []),
  ]);

  const bezahlt = new Set(["paid", "fulfilled", "completed"]);
  const bezahlteOrders = orders.filter(o => bezahlt.has(o.status));
  const ltvCents = bezahlteOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const aovCents = bezahlteOrders.length ? Math.round(ltvCents / bezahlteOrders.length) : 0;
  const waehrung = (orders[0]?.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";

  const name = [customer.vorname, customer.nachname].filter(Boolean).join(" ")
    || customer.email || (customer.telegram_username ? `@${customer.telegram_username}` : "Гость");
  const initial = (customer.vorname ?? customer.email ?? "?").charAt(0).toUpperCase();

  // Quick-Actions (nur vorhandene). Bevorzugter Kanal wird hervorgehoben.
  const waDigits = customer.whatsapp ? customer.whatsapp.replace(/\D/g, "") : "";
  const tgHandle = customer.telegram_username ? customer.telegram_username.replace(/^@+/, "") : "";
  const actions = [
    customer.telefon  && { label: "Звонок",   href: `tel:${customer.telefon.replace(/\s/g, "")}`, icon: Phone,         kanal: "telefon" },
    waDigits          && { label: "WhatsApp", href: `https://wa.me/${waDigits}`,                  icon: MessageCircle, kanal: "whatsapp" },
    tgHandle          && { label: "Telegram", href: `https://t.me/${tgHandle}`,                   icon: Send,          kanal: "telegram" },
    customer.email    && { label: "E-mail",   href: `mailto:${customer.email}`,                   icon: Mail,          kanal: "email" },
  ].filter(Boolean) as { label: string; href: string; icon: React.ElementType; kanal: string }[];

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-10">
        <AdminBack href="/tg/admin/kunden" label="Клиенты" />

        {/* Header */}
        <header className="flex items-center gap-3 mt-2 mb-4">
          <div className="shrink-0 flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--color-coral)", color: "#fff", fontFamily: "var(--font-display)", fontSize: 22 }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate" style={{ fontFamily: "var(--font-display)", fontSize: 21, lineHeight: 1.1, color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              {name}
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              KD-{String(customer.customer_number).padStart(4, "0")} · {TYP_LABEL[customer.customer_type] ?? customer.customer_type}
            </p>
          </div>
        </header>

        {/* Quick-Actions */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {actions.map(a => {
              const Icon = a.icon;
              const bevorzugt = customer.kontakt_kanal === a.kanal;
              return (
                <a key={a.kanal} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium"
                  style={{
                    borderRadius: 8, touchAction: "manipulation",
                    background: bevorzugt ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, #fff)",
                    color:      bevorzugt ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                    border:     `1px solid ${bevorzugt ? "var(--color-coral)" : "var(--color-line)"}`,
                  }}>
                  <Icon className="w-3.5 h-3.5" /> {a.label}
                </a>
              );
            })}
          </div>
        )}

        {/* Kennzahlen */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <Stat label="Заказов" value={String(orders.length)} />
          <Stat label="LTV" value={formatPreis(ltvCents / 100, waehrung, true)} />
          <Stat label="Средний чек" value={aovCents ? formatPreis(aovCents / 100, waehrung, true) : "—"} />
        </div>

        {/* Bestellungen */}
        <section className="mb-5">
          <h2 className="flex items-center gap-1.5 text-[11px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            <Package className="w-3.5 h-3.5" /> Заказы
          </h2>
          {orders.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>Нет заказов</p>
          ) : (
            <div className="space-y-1.5">
              {orders.slice(0, 10).map(o => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, color: "var(--color-ink-mute)" };
                return (
                  <div key={o.id} className="flex items-center gap-2 px-3 py-2"
                    style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
                    <span className="font-mono text-[12px] shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                      GDT-{String(o.order_number).padStart(4, "0")}
                    </span>
                    <span className="text-[11px] flex-1" style={{ color: st.color }}>{st.label}</span>
                    <span className="text-[11px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{datum(o.erstellt_am)}</span>
                    <span className="text-[12px] font-medium shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                      {formatPreis((o.total_cents ?? 0) / 100, waehrung, true)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Aktivitäts-Timeline */}
        <section>
          <h2 className="flex items-center gap-1.5 text-[11px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            <Activity className="w-3.5 h-3.5" /> Активность
          </h2>
          {timeline.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>Нет активности</p>
          ) : (
            <div className="space-y-2">
              {timeline.map((e, i) => {
                const Icon = TL_ICON[e.typ] ?? Activity;
                return (
                  <div key={`${e.ref_id}-${i}`} className="flex items-start gap-2.5">
                    <div className="shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full"
                      style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)" }}>
                      <Icon className="w-3 h-3" style={{ color: "var(--color-coral)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] truncate" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>{e.titel}</p>
                      <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                        {datum(e.ts)}{e.detail ? ` · ${e.detail}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Voll-Akte auf der Website */}
        <Link href={`/admin/kunden/${customer.id}`} target="_blank"
          className="mt-6 flex items-center justify-center gap-1.5 py-2.5 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", border: "1px solid var(--color-line)", color: "var(--tg-theme-link-color, var(--color-coral))", touchAction: "manipulation" }}>
          Полная карточка на сайте ↗
        </Link>
      </main>
    </TelegramAuthGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 text-center" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <p className="tabular-nums truncate" style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--tg-theme-text-color, var(--color-ink))" }}>{value}</p>
      <p className="text-[9px] uppercase font-medium mt-0.5" style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{label}</p>
    </div>
  );
}
