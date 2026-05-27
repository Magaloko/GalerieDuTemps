import Link from "next/link";
import { redirect } from "next/navigation";
import { orderById } from "@/lib/db/orders";
import { getMarketingStrings } from "@/lib/db/marketing-strings";
import { getLocale } from "@/i18n";
import { formatPreis } from "@/lib/utils/preis";
import { Building2, Copy, AlertCircle, ArrowRight } from "lucide-react";
import { CopyButton } from "./copy-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Банковский перевод",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /checkout/zahlung/bank?order=<uuid>
 *
 * Zeigt:
 *  - Reference-Code (= Bestellnummer GDT-XXXX) prominent
 *  - Bank-Daten aus Marketing-Strings (vom Admin editierbar)
 *  - Betrag
 *  - Versand-Hinweis: erst nach Zahlungseingang
 *
 * Customer überweist mit Reference im Verwendungszweck. Admin sieht im
 * Bank-Auszug die Reference → klickt im /admin/bestellungen Status setzen.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function BankZahlungPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.order) redirect("/warenkorb");

  const order = await orderById(sp.order);
  if (!order) redirect("/warenkorb");

  const locale = await getLocale();
  const ms = await getMarketingStrings([
    "payment.bank.kontoinhaber",
    "payment.bank.bank_name",
    "payment.bank.iban",
    "payment.bank.bic",
    "payment.bank.zusatz",
  ], locale).catch(() => ({} as Record<string, string>));

  const reference = order.payment_reference ?? `GDT-${String(order.order_number).padStart(4, "0")}`;
  const zusatz   = (ms["payment.bank.zusatz"] || "Verwendungszweck: {ref}").replace("{ref}", reference);

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }} className="min-h-[100dvh]">
      <div className="max-w-2xl mx-auto px-5 md:px-14 py-14">

        <header className="mb-8">
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            <Building2 className="inline w-3 h-3 mr-1" /> Банковский перевод
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2rem, 5vw, 2.75rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            Заказ <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>{reference}</em>
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            Переведи сумму на наш счёт. Обработка занимает 1–3 банковских дня.
            После поступления мы упакуем и отправим заказ.
          </p>
        </header>

        {/* Bank-Daten-Block */}
        <section
          className="p-5 mb-6"
          style={{ background: "#fff", border: "1px solid var(--color-line)" }}
        >
          <BankRow label="Получатель" value={ms["payment.bank.kontoinhaber"] || "Galerie du Temps KZ"} />
          <BankRow label="Банк"       value={ms["payment.bank.bank_name"]    || "Halyk Bank"} />
          <BankRow label="IBAN / Счёт" value={ms["payment.bank.iban"]        || "—"} mono />
          <BankRow label="BIC / SWIFT" value={ms["payment.bank.bic"]         || "—"} mono />
          <BankRow label="Сумма"
                   value={formatPreis(order.total_cents / 100, (order.waehrung as "KZT"|"EUR"|"USD"|"RUB") ?? "KZT")}
                   highlight />
          <BankRow label="Назначение"
                   value={zusatz}
                   mono highlight />
        </section>

        {/* Wichtig-Hinweis */}
        <div
          className="p-4 mb-6 flex items-start gap-3"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            borderLeft: "3px solid var(--color-coral)",
            color:      "var(--color-ink-soft)",
            fontSize:   13,
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
          <div>
            <b style={{ color: "var(--color-ink)" }}>Важно:</b>{" "}
            Укажи реф-номер <code style={{
              background: "#fff", padding: "1px 6px",
              border: "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)", fontSize: 12,
            }}>{reference}</code> в назначении платежа.
            Без этого мы не сможем сопоставить твою оплату с заказом.
          </div>
        </div>

        <Link
          href={`/kunde/bestellungen/${order.id}`}
          className="btn-coral btn-coral-lg w-full"
          style={{ minHeight: 48, touchAction: "manipulation" }}
        >
          К заказу <ArrowRight className="w-4 h-4" />
        </Link>

        <CopyButton text={zusatz} label="Скопировать назначение платежа" />
      </div>
    </div>
  );
}

function BankRow({
  label, value, mono, highlight,
}: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div
      className="flex items-start justify-between gap-4 py-3"
      style={{ borderBottom: "1px solid var(--color-line)" }}
    >
      <span
        className="text-[11px] uppercase font-medium shrink-0"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
      >
        {label}
      </span>
      <span
        className={mono ? "font-mono" : ""}
        style={{
          textAlign:  "right",
          fontFamily: mono ? "var(--font-mono)" : highlight ? "var(--font-display)" : undefined,
          fontSize:   highlight ? 16 : 14,
          fontWeight: highlight ? undefined : 400,
          color:      highlight ? "var(--color-coral)" : "var(--color-ink)",
          wordBreak:  "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}
