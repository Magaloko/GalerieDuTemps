/**
 * Sentry-Edge-Initialisierung (Edge-Runtime, z.B. Middleware/proxy.ts).
 * Wird via src/instrumentation.ts geladen.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,

  environment: process.env.NODE_ENV,

  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],
});
