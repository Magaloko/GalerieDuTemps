import Link from "next/link";
import { redirect } from "next/navigation";
import { orderById } from "@/lib/db/orders";
import { isFeatureEnabled } from "@/lib/db/feature-flags";
import { getMarketingStrings } from "@/lib/db/marketing-strings";
import { getLocale } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";
import { Handshake, AlertCircle, ArrowRight, CalendarClock } from "lucide-react";
import { CopyButton } from "../bank/copy-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бронь с предоплатой",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /checkout/zahlung/anzahlung?order=<uuid>
 *
 * Zeigt nach Wahl von „Самовывоз — оплата при получении (с предоплатой)":
 *  - Anzahlungs-Betrag (≈30 %) + Restbetrag bei Abholung
 *  - Reserviert-bis-Datum (7 Tage)
 *  - Bank-Daten + Referenz GDT-XXXX für die Anzahlungs-Überweisung
 *  - Hinweis: Reservierung greift erst nach Eingang der Anzahlung
 * ────────────────────────────────────────────────────────────────────────── */
export default async function AnzahlungZahlungPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.order) redirect("/warenkorb");

  if (!(await isFeatureEnabled("kaufen_aktiv").catch(() => true))) {
    redirect("/warenkorb");
  }

  const order = await orderById(sp.order);
  if (!order) redirect("/warenkorb");

  // IDOR-Schutz: nur dem Besteller zeigen.
  const { darfCheckoutBearbeiten } = await import("@/lib/checkout/access");
  if (!(await darfCheckoutBearbeiten(order))) redirect("/warenkorb");

  const locale = await getLocale();
  const ms = await getMarketingStrings([
    "payment.bank.kontoinhaber",
    "payment.bank.bank_name",
    "payment.bank.iban",
    "payment.bank.bic",
    "payment.bank.zusatz",
    "payment.vor_ort.adresse",
  ], locale).catch(() => ({} as Record<string, string>));

  const waehrung   = (order.waehrung as "KZT" | "EUR" | "USD" | "RUB") ?? "KZT";
  const reference  = order.payment_reference ?? `GDT-${String(order.order_number).padStart(4, "0")}`;
  const anzahlung  = order.anzahlung_cents ?? Math.round(order.total_cents * 0.3);
  const rest       = Math.max(0, order.total_cents - anzahlung);
  const zusatz     = (ms["payment.bank.zusatz"] || "Назначение: {ref}").replace("{ref}", reference);

  const reserveBisRaw = (order.payment_meta as { reserve_bis?: string } | null)?.reserve_bis;
  const reserveBis = reserveBisRaw
    ? new Date(reserveBisRaw).toLocaleDateString(locale === "ru" ? "ru-RU" : locale, { day: "numeric", month: "long" })
    : null;

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }} className="min-h-[100dvh]">
      <div className="max-w-2xl mx-auto px-5 md:px-14 py-14">

        <header className="mb-8">
          <p className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            <Handshake className="inline w-3 h-3 mr-1" /> Бронь с предоплатой
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 2.75rem)", color: "var(--color-ink)", lineHeight: 1.05 }}>
            Заказ <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>{reference}</em>
          </h1>
          <p className="mt-4 text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", color: "var(--color-ink-soft)" }}>
            Внеси предоплату переводом — и мы отложим вещь для тебя. Остаток оплачиваешь
            при получении в галерее.
          </p>
        </header>

        {/* Reservierungs-Frist */}
        {reserveBis && (
          <div className="p-4 mb-6 flex items-center gap-3"
            style={{ background: "#fff", border: "1px solid var(--color-line)", borderLeft: "3px solid var(--color-coral)" }}>
            <CalendarClock className="w-5 h-5 shrink-0" style={{ color: "var(--color-coral)" }} />
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Резерв действует до <b style={{ color: "var(--color-ink)" }}>{reserveBis}</b> — после
              поступления предоплаты.
            </p>
          </div>
        )}

        {/* Beträge */}
        <section className="p-5 mb-6" style={{ background: "#fff", border: "1px solid var(--color-line)" }}>
          <Row label="Сумма заказа" value={formatPreis(order.total_cents / 100, waehrung)} />
          <Row label="Предоплата сейчас" value={formatPreis(anzahlung / 100, waehrung)} highlight />
          <Row label="Остаток при получении" value={formatPreis(rest / 100, waehrung)} />
        </section>

        {/* Bank-Daten für Anzahlung */}
        <section className="p-5 mb-6" style={{ background: "#fff", border: "1px solid var(--color-line)" }}>
          <p className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.2em", color: "var(--color-ink-mute)" }}>
            Реквизиты для предоплаты
          </p>
          <Row label="Получатель"  value={ms["payment.bank.kontoinhaber"] || "Galerie du Temps KZ"} />
          <Row label="Банк"        value={ms["payment.bank.bank_name"]    || "Halyk Bank"} />
          <Row label="IBAN / Счёт" value={ms["payment.bank.iban"]         || "—"} mono />
          <Row label="BIC / SWIFT" value={ms["payment.bank.bic"]          || "—"} mono />
          <Row label="К переводу"  value={formatPreis(anzahlung / 100, waehrung)} highlight />
          <Row label="Назначение"  value={zusatz} mono highlight />
        </section>

        {/* Wichtig */}
        <div className="p-4 mb-6 flex items-start gap-3"
          style={{ background: "rgba(232,112,58,0.08)", border: "1px solid rgba(232,112,58,0.35)", borderLeft: "3px solid var(--color-coral)", color: "var(--color-ink-soft)", fontSize: 13 }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
          <div>
            <b style={{ color: "var(--color-ink)" }}>Важно:</b>{" "}
            укажи реф-номер <code style={{ background: "#fff", padding: "1px 6px", border: "1px solid var(--color-line)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{reference}</code>{" "}
            в назначении платежа. Остаток {formatPreis(rest / 100, waehrung)} — наличными или картой
            при получении{ms["payment.vor_ort.adresse"] ? `: ${ms["payment.vor_ort.adresse"]}` : " в галерее"}.
          </div>
        </div>

        <Link href={`/kunde/bestellungen/${order.id}`} className="btn-coral btn-coral-lg w-full"
          style={{ minHeight: 48, touchAction: "manipulation" }}>
          К заказу <ArrowRight className="w-4 h-4" />
        </Link>

        <CopyButton text={zusatz} label="Скопировать назначение платежа" />
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
      <span className="text-[11px] uppercase font-medium shrink-0"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>
        {label}
      </span>
      <span className={mono ? "font-mono" : ""}
        style={{
          textAlign: "right",
          fontFamily: mono ? "var(--font-mono)" : highlight ? "var(--font-display)" : undefined,
          fontSize: highlight ? 16 : 14,
          color: highlight ? "var(--color-coral)" : "var(--color-ink)",
          wordBreak: "break-all",
        }}>
        {value}
      </span>
    </div>
  );
}
