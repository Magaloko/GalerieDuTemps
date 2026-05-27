import type { PaymentMethod } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * Payment-Methoden-Registry
 *
 * Single source of truth für alle verfügbaren Methoden:
 *  - Welche werden im UI angezeigt
 *  - Provider-Status (env-konfiguriert oder nicht)
 *  - i18n-Labels und Sub-Texte
 *  - Verfügbarkeit nach Lieferland (z.B. „vor_ort" nur KZ)
 *  - Endpoint für Submit
 *
 * UI fragt isMethodAvailable() für jede Methode an, server-side, und
 * filtert die Liste entsprechend. Niemals client-only filtern — sonst kann
 * jemand via DevTools eine deaktivierte Methode submitten.
 * ────────────────────────────────────────────────────────────────────────── */

export interface PaymentMethodInfo {
  method:        PaymentMethod;
  icon:          string;          // emoji-Marker für schnelle UI
  endpoint:      string;          // POST URL für diese Methode
  requiresShippingCountry?: string[];   // wenn gesetzt: nur bei diesen ISO-Codes verfügbar
  labels: {
    title:       Record<string, string>;
    sub:         Record<string, string>;
  };
}

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    method:   "stripe_card",
    icon:     "💳",
    endpoint: "/api/checkout/stripe",
    labels: {
      title: {
        ru: "Карта (Visa / Mastercard)",
        en: "Card (Visa / Mastercard)",
        de: "Karte (Visa / Mastercard)",
      },
      sub: {
        ru: "Apple Pay · Google Pay через Stripe",
        en: "Apple Pay · Google Pay via Stripe",
        de: "Apple Pay · Google Pay über Stripe",
      },
    },
  },
  {
    method:   "paypal",
    icon:     "🅿",
    endpoint: "/api/checkout/paypal",
    labels: {
      title: {
        ru: "PayPal",
        en: "PayPal",
        de: "PayPal",
      },
      sub: {
        ru: "Оплата через PayPal-аккаунт или карту",
        en: "Pay via PayPal account or card",
        de: "Bezahlung über PayPal-Konto oder Karte",
      },
    },
  },
  {
    method:   "crypto_nowpayments",
    icon:     "₿",
    endpoint: "/api/checkout/crypto",
    labels: {
      title: {
        ru: "Криптовалюта",
        en: "Cryptocurrency",
        de: "Kryptowährung",
      },
      sub: {
        ru: "BTC · ETH · USDT и др. через NowPayments",
        en: "BTC · ETH · USDT etc. via NowPayments",
        de: "BTC · ETH · USDT u.a. via NowPayments",
      },
    },
  },
  {
    method:   "bank_transfer",
    icon:     "🏦",
    endpoint: "/api/checkout/bank-transfer",
    labels: {
      title: {
        ru: "Банковский перевод",
        en: "Bank transfer",
        de: "Banküberweisung",
      },
      sub: {
        ru: "Реквизиты придут после оформления. Доставка после поступления.",
        en: "Bank details after order. Shipping once payment received.",
        de: "Bankdaten nach Bestellung. Versand nach Zahlungseingang.",
      },
    },
  },
  {
    method:   "vor_ort_anzahlung",
    icon:     "🤝",
    endpoint: "/api/checkout/anzahlung",
    requiresShippingCountry: ["KZ"],
    labels: {
      title: {
        ru: "Самовывоз — оплата при получении (с предоплатой)",
        en: "Pickup — pay on collection (with deposit)",
        de: "Abholung — vor Ort bezahlen (mit Anzahlung)",
      },
      sub: {
        ru: "Резерв на 7 дней. Предоплата онлайн ≈30%, остаток в галерее.",
        en: "7-day hold. Online deposit ~30%, balance at gallery.",
        de: "7-Tage-Reservierung. Online-Anzahlung ~30%, Rest in der Galerie.",
      },
    },
  },
  {
    method:   "vor_ort",
    icon:     "🏛",
    endpoint: "/api/checkout/vor-ort",
    requiresShippingCountry: ["KZ"],
    labels: {
      title: {
        ru: "Самовывоз — оплата при получении",
        en: "Pickup — pay on collection",
        de: "Abholung — vor Ort bezahlen",
      },
      sub: {
        ru: "Резерв на 3 дня. Адрес: ул. Достык 89, Алматы.",
        en: "3-day hold. Address: Dostyk 89, Almaty.",
        de: "3-Tage-Reservierung. Adresse: Dostyk 89, Almaty.",
      },
    },
  },
];

/**
 * Prüft ob eine Methode für den aktuellen Kontext (env, Land, Customer-Type)
 * verfügbar ist.
 */
export function isMethodAvailable(
  info: PaymentMethodInfo,
  ctx:  { shippingCountry?: string; envCheck?: boolean },
): boolean {
  if (info.requiresShippingCountry && ctx.shippingCountry) {
    if (!info.requiresShippingCountry.includes(ctx.shippingCountry.toUpperCase())) return false;
  }
  // envCheck wird vom Server gesetzt — true wenn Provider-Token konfiguriert
  if (ctx.envCheck === false) return false;
  return true;
}

/** Server-side: env-vars prüfen pro Provider. */
export function providerEnvOk(method: PaymentMethod): boolean {
  switch (method) {
    case "stripe_card":
    case "stripe_sepa":
    case "vor_ort_anzahlung":      // nutzt Stripe-PaymentIntent
      return Boolean(process.env.STRIPE_SECRET_KEY);
    case "paypal":
      return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
    case "crypto_nowpayments":
      return Boolean(process.env.NOWPAYMENTS_API_KEY);
    case "telegram_payments":
      return Boolean(process.env.TELEGRAM_PAYMENTS_PROVIDER_TOKEN);
    case "bank_transfer":
    case "vor_ort":
    case "kaspi":
      return true;                 // brauchen keinen Provider-Key
  }
}

/** Generiert eine eindeutige Reference für Bank-Transfer / Vor-Ort. */
export function generatePaymentReference(orderNumber: number): string {
  return `GDT-${String(orderNumber).padStart(4, "0")}`;
}
