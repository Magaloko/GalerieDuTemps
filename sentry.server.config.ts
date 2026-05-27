/**
 * Sentry-Server-Initialisierung (Node.js-Runtime).
 * Wird via src/instrumentation.ts geladen.
 *
 * Erfasst:
 *  - Errors in API-Routes, Server-Actions, Server-Components
 *  - Unhandled Promise Rejections
 *  - Performance-Traces für DB-Queries, HTTP-Calls, sharp-Image-Processing
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  // Niedrigere Trace-Rate auf Server (sonst Quota-Killer)
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Lokale Variablen in Stack-Traces → besseres Debugging
  // (Kostet etwas Performance, aber lohnt sich für seltene Errors)
  includeLocalVariables: true,

  enableLogs: true,

  environment: process.env.NODE_ENV,

  // PII-Scrubbing: bevor Events an Sentry gehen, sensible Daten entfernen.
  // Liste basiert auf Codex-Audit + Folge-Audit (Welle-Detail-Page).
  beforeSend(event) {
    const SENSITIVE_KEYS = [
      // Auth & Payment
      "password", "passwort", "iban", "bic", "kartennummer", "cvc", "stripe_secret_key",
      // PII (DSGVO + CCPA)
      "email", "e_mail", "kontakt_email", "customer_email", "firma_email",
      "phone", "telefon", "whatsapp_nummer", "kontakt_telefon",
      "telegram_chat_id", "telegram_username", "instagram_handle",
      // KZ-spezifisch
      "iin", "bin", "kbe", "iin_snapshot", "bin_snapshot",
      // Tokens
      "auth_token", "session_token", "telegram_link_token", "email_confirmation_token",
      "passwort_reset_token", "dnc_token",
    ];

    function scrubObject(obj: Record<string, unknown>): void {
      for (const key of Object.keys(obj)) {
        // Direct match (case-insensitive)
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
          obj[key] = "[Filtered]";
          continue;
        }
        // Substring match: alles was "email"/"phone"/"token" im Namen hat
        const k = key.toLowerCase();
        if (/(email|phone|telefon|token|password|passwort|iban|kartennummer|cvc|secret)/.test(k)) {
          obj[key] = "[Filtered]";
          continue;
        }
        // Recurse into nested objects (1 Level tief — keine Endlos-Tiefen)
        const v = obj[key];
        if (v && typeof v === "object" && !Array.isArray(v)) {
          scrubObject(v as Record<string, unknown>);
        }
      }
    }

    // Request-Body scrubben
    if (event.request?.data && typeof event.request.data === "object") {
      scrubObject(event.request.data as Record<string, unknown>);
    }
    // Request-Headers scrubben (Cookies, Authorization)
    if (event.request?.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (/(cookie|authorization|api-key|x-api|auth)/i.test(key)) {
          event.request.headers[key] = "[Filtered]";
        }
      }
    }
    // Extra-Felder scrubben (Stripe-Keys + alles String das wie Secret aussieht)
    if (event.extra) {
      for (const k of Object.keys(event.extra)) {
        const v = event.extra[k];
        if (typeof v === "string") {
          if (/sk_(live|test)_|whsec_|re_[A-Za-z0-9_-]{20,}/.test(v)) {
            event.extra[k] = "[Filtered Secret]";
          }
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
          scrubObject(v as Record<string, unknown>);
        }
      }
    }
    return event;
  },

  ignoreErrors: [
    // Zod-Validierungsfehler werfen wir absichtlich → kein Sentry-Issue
    "ZodError",
    // NextNotFoundError ist Teil der Routing-Logik
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],
});
