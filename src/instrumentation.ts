/**
 * Next.js instrumentation hook — wird einmal beim Server-Start ausgeführt.
 * Hier registrieren wir Sentry für Node.js + Edge-Runtimes.
 *
 * Doku: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // ENV früh validieren — fehlende Pflicht-Variablen brechen den Boot ab
    // (sichtbarer Fehler statt stiller 500er im Betrieb).
    const { validateEnv } = await import("./lib/env");
    validateEnv();
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/**
 * Erfasst Fehler aus Server-Components, Route-Handlers, Server-Actions.
 * Ohne diesen Hook würden viele Server-Errors stillschweigend in Logs landen
 * ohne Sentry-Issue zu erzeugen.
 */
export const onRequestError = Sentry.captureRequestError;
