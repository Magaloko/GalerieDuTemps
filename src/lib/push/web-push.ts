import webpush from "web-push";
import { query } from "@/lib/db";

/* ──────────────────────────────────────────────────────────────────────────
 * Web-Push — Low-Level-Versand (Server-only!)
 *
 * `web-push` darf NUR serverseitig importiert werden (nutzt Node-Crypto +
 * den VAPID-Private-Key). Niemals in einer "use client"-Datei importieren.
 *
 * VAPID-Konfiguration kommt aus ENV:
 *   VAPID_PUBLIC_KEY  (oder NEXT_PUBLIC_VAPID_PUBLIC_KEY als Fallback)
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT     (Default mailto:bonjour@galeriedutemps.kz)
 *
 * Wenn keine Keys gesetzt sind → no-op (sendPush returnt einfach), damit
 * weder Build noch Runtime crasht (z.B. lokal ohne Keys, oder vor dem
 * Coolify-ENV-Setup).
 * ────────────────────────────────────────────────────────────────────────── */

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
}

let configured: boolean | null = null;

/** Konfiguriert VAPID lazy + memoized. Returnt false, wenn Keys fehlen. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;

  const publicKey =
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject    = process.env.VAPID_SUBJECT?.trim() || "mailto:bonjour@galeriedutemps.kz";

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    console.error("[web-push] setVapidDetails fehlgeschlagen:", err);
    configured = false;
  }
  return configured;
}

/**
 * Sendet eine Push-Notification an eine einzelne Subscription.
 * - Keine VAPID-Keys → no-op.
 * - StatusCode 404/410 → Subscription ist tot, per endpoint aus DB löschen.
 * - Andere Fehler → nur loggen (nicht löschen, könnte transient sein).
 */
export async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Tote Subscription → aufräumen.
      try {
        await query(`DELETE FROM sebo.push_subscriptions WHERE endpoint = $1`, [sub.endpoint]);
      } catch (delErr) {
        console.error("[web-push] Löschen toter Subscription fehlgeschlagen:", delErr);
      }
    } else {
      console.error("[web-push] sendNotification fehlgeschlagen:", statusCode ?? "", err);
    }
  }
}
