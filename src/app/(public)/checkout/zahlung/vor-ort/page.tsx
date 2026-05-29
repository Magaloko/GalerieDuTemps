import Link from "next/link";
import { redirect } from "next/navigation";
import { orderById } from "@/lib/db/orders";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { getMarketingStrings } from "@/lib/db/marketing-strings";
import { getLocale } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Самовывоз",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /checkout/zahlung/vor-ort?order=<uuid>
 *
 * Self-Pickup-Bestätigung:
 *  - Reserve-Bis-Datum
 *  - Adresse + Öffnungszeiten (aus Marketing-Strings)
 *  - Reference-Code für Vor-Ort-Identifikation
 *  - Hinweis: keine Online-Zahlung nötig
 * ────────────────────────────────────────────────────────────────────────── */
export default async function VorOrtZahlungPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.order) redirect("/warenkorb");

  // Schaufenster: keine Zahlungs-/Reservierungs-UI.
  if (!(await isFeatureEnabled("kaufen_aktiv").catch(() => true))) {
    redirect("/warenkorb");
  }

  const order = await orderById(sp.order);
  if (!order) redirect("/warenkorb");

  // IDOR-Schutz: Reservierungsdaten nur dem Besteller zeigen.
  const { darfCheckoutBearbeiten } = await import("@/lib/checkout/access");
  if (!(await darfCheckoutBearbeiten(order))) redirect("/warenkorb");

  const locale = await getLocale();
  const ms = await getMarketingStrings([
    "payment.vor_ort.adresse",
    "payment.vor_ort.oeffnungszeiten",
  ], locale).catch(() => ({} as Record<string, string>));

  const reference = order.payment_reference ?? `GDT-${String(order.order_number).padStart(4, "0")}`;
  const meta      = (order.payment_meta ?? {}) as { reserve_bis?: string };
  const reserveBis = meta.reserve_bis
    ? new Date(meta.reserve_bis).toLocaleString("ru-RU", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }} className="min-h-[100dvh]">
      <div className="max-w-2xl mx-auto px-5 md:px-14 py-14">

        <header className="mb-8">
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            🏛 Самовывоз
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2rem, 5vw, 2.75rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            Заказ забронирован — <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>{reference}</em>
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            Мы держим товар для тебя до момента самовывоза. Оплата на месте —
            картой или наличными в галерее.
          </p>
        </header>

        <section
          className="p-5 mb-6 space-y-4"
          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
        >
          <Row
            icon={<MapPin className="w-4 h-4" />}
            label="Адрес"
            value={ms["payment.vor_ort.adresse"] || "Алматы"}
          />
          <Row
            icon={<Clock className="w-4 h-4" />}
            label="Часы работы"
            value={ms["payment.vor_ort.oeffnungszeiten"] || "Mo–Fr 10:00–18:00"}
          />
          {reserveBis && (
            <Row
              icon={<span aria-hidden>⏳</span>}
              label="Резерв до"
              value={reserveBis}
              highlight
            />
          )}
          <Row
            icon={<span aria-hidden>💰</span>}
            label="К оплате на месте"
            value={formatPreis(order.total_cents / 100, (order.waehrung as "KZT"|"EUR"|"USD"|"RUB") ?? "KZT")}
            highlight
          />
        </section>

        <div
          className="p-4 mb-6 text-[13px]"
          style={{
            background: "var(--color-bone)",
            border:     "1px solid var(--color-line)",
            color:      "var(--color-ink-soft)",
          }}
        >
          Назови в галерее свой номер <code style={{
            background: "#fff", padding: "1px 6px",
            border: "1px solid var(--color-line)",
            fontFamily: "var(--font-mono)", fontSize: 12,
          }}>{reference}</code> — сотрудник найдёт твой заказ.
        </div>

        <Link
          href={`/kunde/bestellungen/${order.id}`}
          className="btn-coral btn-coral-lg w-full"
          style={{ minHeight: 48, touchAction: "manipulation" }}
        >
          К заказу <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function Row({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 mt-0.5"
        style={{ color: highlight ? "var(--color-coral)" : "var(--color-ink-mute)" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] uppercase font-medium mb-1"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: highlight ? "var(--font-display)" : undefined,
            fontSize:   highlight ? 18 : 14,
            color:      highlight ? "var(--color-coral)" : "var(--color-ink)",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
