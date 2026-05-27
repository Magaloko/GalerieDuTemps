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

  // PII-Scrubbing: bevor Events an Sentry gehen, sensible Daten entfernen
  beforeSend(event) {
    // Request-Body kann IBAN/Email/Passwort enthalten — pauschal scrubben
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      for (const key of ["password", "passwort", "iban", "kartennummer", "cvc", "telegram_chat_id"]) {
        if (key in data) data[key] = "[Filtered]";
      }
    }
    // Stripe-Secret-Keys versehentlich in Logs? → strippen
    if (event.extra) {
      for (const k of Object.keys(event.extra)) {
        const v = event.extra[k];
        if (typeof v === "string" && /sk_(live|test)_/.test(v)) {
          event.extra[k] = "[Filtered Stripe Key]";
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
