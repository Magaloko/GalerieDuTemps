/**
 * Sentry-Client-Initialisierung (Browser-Runtime).
 * Wird automatisch von Next.js geladen sobald die App im Client started.
 *
 * Konfiguration:
 *  - sendDefaultPii: true → IP-Adresse + User-Agent + Cookies an Sentry
 *    (für Debugging hilfreich; sensitive Cookies werden in beforeSend gescrubbt)
 *  - tracesSampleRate: 100% in dev, 10% in prod (Performance-Sampling)
 *  - replaysSessionSampleRate: 10% aller Sessions (Replay-Recording)
 *  - replaysOnErrorSampleRate: 100% bei Errors → immer ein Replay zum Bug
 *
 * Ignorierte Errors:
 *  - ResizeObserver-Loop-Warnings (Browser-Noise, kein echter Bug)
 *  - Instagram-embed.js Errors (Third-Party, nicht actionable für uns)
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // PII + Replay
  sendDefaultPii: true,

  // Performance-Sampling
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session-Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured Logging (Sentry Logs)
  enableLogs: true,

  // Default-Environment: production unless explicitly set
  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration({
      // Mask sensitive form fields automatisch (Passwörter, Karten-Daten,
      // IBAN, etc.) — gilt für alle input[type=password] + .sentry-mask CSS-Klasse
      maskAllInputs: true,
      blockAllMedia: false,
    }),
  ],

  // ── Noise-Filter ──────────────────────────────────────────────────────────
  ignoreErrors: [
    // Browser-Quirks (kein echter Bug)
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network-Errors zu Third-Party-Scripts
    /instagram\.com\/embed\.js/,
    // Bot-Crawler / Network-Aborts
    "NetworkError when attempting to fetch resource.",
    "Failed to fetch",
    // User hat Tab geschlossen während Request lief
    "The operation was aborted.",
    "AbortError",
  ],

  denyUrls: [
    // Browser-Extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],
});

/**
 * Hook für Next.js App-Router-Navigations.
 * Sentry verfolgt Page-Transitions (für Web-Vitals + User-Flow).
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
