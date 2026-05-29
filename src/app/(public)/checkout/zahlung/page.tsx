import { redirect } from "next/navigation";
import { orderById } from "@/lib/db/orders";
import { kaufenGesperrt } from "@/lib/db/feature-flags";
import { getLocale } from "@/i18n";
import { PAYMENT_METHODS, isMethodAvailable, providerEnvOk } from "@/lib/payment/methods";
import { MethodPicker } from "./method-picker";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { TrustStrip } from "@/components/checkout/trust-strip";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Способ оплаты",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /checkout/zahlung?order=<uuid>
 *
 * Zwischenstopp zwischen Cart → Bezahlmethoden-Wahl → Provider-Redirect.
 *
 * Filter:
 *  - Lieferland aus order.shipping_address → entscheidet ob Vor-Ort/Vor-Ort-
 *    Anzahlung angeboten werden (nur KZ).
 *  - Server-side providerEnvOk: deaktivierte Provider werden nicht gelistet.
 *  - Wenn Order schon bezahlt: Redirect zur Erfolg-Page.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function ZahlungsmethodePage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; t?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.order) redirect("/warenkorb");

  // Schaufenster: keine Zahlungs-UI — fail-closed (DB-Fehler ⇒ gesperrt),
  // konsistent mit allen Checkout-API-Routen.
  if (await kaufenGesperrt()) {
    redirect("/warenkorb");
  }

  const [order, locale] = await Promise.all([
    orderById(sp.order),
    getLocale(),
  ]);
  if (!order) redirect("/warenkorb");
  if (order.status !== "pending") redirect(`/checkout/erfolg/${order.id}`);

  // IDOR-Schutz: Checkout-Cookie (oder eingeloggter Eigentümer). ?t= nur
  // noch Übergangs-Fallback für alte Links.
  const { darfCheckoutBearbeiten } = await import("@/lib/checkout/access");
  const darf = await darfCheckoutBearbeiten(order, { legacyToken: sp.t ?? null });
  if (!darf) redirect("/warenkorb");

  const shippingCountry = (order.shipping_address as { land?: string })?.land?.toUpperCase();

  const available = PAYMENT_METHODS.filter(m =>
    isMethodAvailable(m, {
      shippingCountry,
      envCheck: providerEnvOk(m.method),
    })
  );

  return (
    <div style={{ background: "var(--color-paper)", color: "var(--color-ink)" }} className="min-h-[100dvh]">
      <div className="max-w-3xl mx-auto px-5 md:px-14 py-10 md:py-14">

        <StepIndicator current="payment" />

        <header className="mb-10 text-center">
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Шаг 2 · Оплата
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.25rem, 5vw, 3rem)",
              color:      "var(--color-ink)",
              lineHeight: 1,
            }}
          >
            Выберите способ <em className="font-italic" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>оплаты</em>.
          </h1>
          <p
            className="mt-4 text-sm"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
            }}
          >
            {available.length} способ{available.length === 1 ? "" : "ов"} доступн{available.length === 1 ? "" : "о"} для вашей суммы и страны доставки.
          </p>
        </header>

        <MethodPicker
          orderId={order.id}
          totalCents={order.total_cents}
          waehrung={order.waehrung ?? "KZT"}
          methods={available.map(m => ({
            method:   m.method,
            icon:     m.icon,
            endpoint: m.endpoint,
            title:    m.labels.title[locale]  ?? m.labels.title.ru,
            sub:      m.labels.sub[locale]    ?? m.labels.sub.ru,
          }))}
          locale={locale}
        />

        <TrustStrip />

      </div>
    </div>
  );
}
