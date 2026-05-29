import { query } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import { sendPush, type PushSubscriptionRow } from "./web-push";

/* ──────────────────────────────────────────────────────────────────────────
 * Web-Push — Admin-Broadcast (Server-only!)
 *
 * notifyAdminsPush() sendet eine Push-Notification an ALLE Push-Subscriptions
 * aktiver Admins/Superadmins. Best-Effort: Fehler werden geloggt, nie an den
 * Aufrufer propagiert (Checkout/Lead-Flow darf nie an einer Push hängenbleiben).
 *
 * - URL wird zu einer absoluten URL (via getSiteUrl) aufgelöst, damit der
 *   notificationclick-Handler im Service-Worker direkt das richtige Fenster
 *   öffnen kann.
 * - Pro erfolgreich angesprochener Subscription wird letzter_push_am + ein
 *   Eintrag in sebo.notification_log (kanal='web_push') geschrieben.
 * ────────────────────────────────────────────────────────────────────────── */

interface AdminPushRow extends PushSubscriptionRow {
  id:          string;       // push_subscriptions.id (BIGSERIAL → string via pg)
  benutzer_id: string | null;
}

function absoluteUrl(url?: string): string {
  if (!url) return getSiteUrl();
  if (url.startsWith("http")) return url;
  return getSiteUrl() + (url.startsWith("/") ? url : "/" + url);
}

/**
 * Sendet (title, body, url) als Web-Push an alle Admin-Geräte.
 * @param event_typ optionaler Event-Typ fürs notification_log (Default 'web_push').
 */
export async function notifyAdminsPush(
  title: string,
  body: string,
  url?: string,
  event_typ = "web_push",
): Promise<void> {
  try {
    const r = await query<AdminPushRow>(
      `SELECT ps.id, ps.benutzer_id, ps.endpoint, ps.p256dh, ps.auth
       FROM sebo.push_subscriptions ps
       JOIN sebo.benutzer b ON b.id = ps.benutzer_id
       WHERE b.aktiv = true
         AND b.rolle IN ('admin','superadmin')`,
    );
    if (r.rows.length === 0) return;

    const payload = { title, body, url: absoluteUrl(url) };

    for (const sub of r.rows) {
      try {
        await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        );
        // letzter_push_am aktualisieren (best-effort).
        await query(
          `UPDATE sebo.push_subscriptions SET letzter_push_am = now() WHERE id = $1`,
          [sub.id],
        );
        // Log-Eintrag (kanal='web_push'). referenz_id = ggf. aus URL extrahierbar,
        // hier lassen wir es leer — der event_typ + Zeitstempel genügt.
        if (sub.benutzer_id) {
          await query(
            `INSERT INTO sebo.notification_log (benutzer_id, kanal, event_typ, referenz_id)
             VALUES ($1, 'web_push', $2, NULL)`,
            [sub.benutzer_id, event_typ],
          ).catch(() => {});
        }
      } catch (err) {
        console.error("[notifyAdminsPush] Subscription", sub.endpoint, err);
      }
    }
  } catch (err) {
    console.error("[notifyAdminsPush] unexpected", err);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Kunden-Broadcast — Push an alle Shop-Besucher mit audience='customer'.
 *
 * Im Gegensatz zu notifyAdminsPush wird hier NICHT ins notification_log
 * geschrieben: das Log ist benutzer-scoped (sebo.benutzer), Kunden-Subscriptions
 * haben aber kein benutzer_id (customer_id oder anonym). Wir aktualisieren nur
 * letzter_push_am. Best-Effort: jeder Fehler wird geloggt, nie propagiert.
 * ────────────────────────────────────────────────────────────────────────── */

interface CustomerPushRow extends PushSubscriptionRow {
  id: string; // push_subscriptions.id (BIGSERIAL → string via pg)
}

/** Sendet (title, body, url) als Web-Push an alle Kunden-Geräte. */
export async function notifyCustomersPush(
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  try {
    const r = await query<CustomerPushRow>(
      `SELECT id, endpoint, p256dh, auth
       FROM sebo.push_subscriptions
       WHERE audience = 'customer'`,
    );
    if (r.rows.length === 0) return;

    const payload = { title, body, url: absoluteUrl(url) };

    for (const sub of r.rows) {
      try {
        await sendPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        );
        await query(
          `UPDATE sebo.push_subscriptions SET letzter_push_am = now() WHERE id = $1`,
          [sub.id],
        );
      } catch (err) {
        console.error("[notifyCustomersPush] Subscription", sub.endpoint, err);
      }
    }
  } catch (err) {
    console.error("[notifyCustomersPush] unexpected", err);
  }
}
