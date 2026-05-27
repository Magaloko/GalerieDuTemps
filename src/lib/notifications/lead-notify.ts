import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import type { Lead } from "@/lib/db/leads";

const THROTTLE_MIN = 15;   // max 1 Mail/15min/Admin/Event

interface AdminEmpfaenger {
  id:    string;
  name:  string | null;
  email: string;
}

async function aktiveAdmins(): Promise<AdminEmpfaenger[]> {
  const r = await query<AdminEmpfaenger>(
    `SELECT id, name, email
     FROM sebo.benutzer
     WHERE aktiv = true AND rolle IN ('admin','superadmin')`
  );
  return r.rows;
}

async function bereitsBenachrichtigt(
  benutzer_id: string,
  event_typ:   string
): Promise<boolean> {
  const r = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM sebo.notification_log
     WHERE benutzer_id = $1
       AND event_typ   = $2
       AND gesendet_am > now() - ($3 || ' minutes')::interval`,
    [benutzer_id, event_typ, THROTTLE_MIN]
  );
  return (r.rows[0]?.count ?? 0) > 0;
}

async function logNotification(
  benutzer_id: string,
  kanal:       "email" | "web_push" | "telegram",
  event_typ:   string,
  referenz_id?: string
): Promise<void> {
  await query(
    `INSERT INTO sebo.notification_log (benutzer_id, kanal, event_typ, referenz_id)
     VALUES ($1, $2, $3, $4)`,
    [benutzer_id, kanal, event_typ, referenz_id ?? null]
  );
}

const QUELLE_LABEL: Record<string, string> = {
  kontaktanfrage:    "Kontaktformular",
  instagram_dm:      "Instagram · DM",
  instagram_comment: "Instagram · Kommentar",
  instagram_mention: "Instagram · Mention",
  telegram:          "Telegram",
  whatsapp:          "WhatsApp",
  mail:              "E-Mail",
  manuell:           "Manuell",
};

/**
 * Benachrichtigt alle aktiven Admins über einen neuen Lead.
 * - Pro Admin maximal 1 Mail/15min (Throttle via sebo.notification_log)
 * - Best-Effort: Fehler werden geloggt aber nicht propagiert
 */
export async function notifyNewLead(lead: Pick<Lead,
  "id" | "quelle" | "kontakt_name" | "kontakt_email" | "kontakt_handle" | "betreff" | "vorschau" | "produkt_id"
>): Promise<void> {
  try {
    const admins  = await aktiveAdmins();
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "https://galerie.apps.dadakaev.tech";
    const leadUrl = `${appUrl}/admin/leads/${lead.id}`;
    const quelle  = QUELLE_LABEL[lead.quelle] ?? lead.quelle;
    const subject = `🔔 Neuer Lead · ${quelle}`;
    const contact = lead.kontakt_name ?? lead.kontakt_handle ?? lead.kontakt_email ?? "Unbekannt";

    const htmlContent = `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;background:#FAF5E9;color:#1A120B">
        <p style="color:#C9A86A;font-size:11px;letter-spacing:0.3em;text-transform:uppercase">✦ GALERIE du Temps</p>
        <h2 style="font-size:22px;color:#1A120B;margin:0 0 12px">Neuer Lead in deiner Inbox</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 0;color:#7A6A55;width:120px">Kanal:</td><td><strong>${quelle}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#7A6A55">Kontakt:</td><td>${contact}</td></tr>
          ${lead.kontakt_email ? `<tr><td style="padding:6px 0;color:#7A6A55">E-Mail:</td><td>${lead.kontakt_email}</td></tr>` : ""}
          ${lead.betreff ? `<tr><td style="padding:6px 0;color:#7A6A55">Betreff:</td><td>${lead.betreff}</td></tr>` : ""}
        </table>
        ${lead.vorschau ? `<blockquote style="border-left:3px solid #C9A86A;padding:8px 16px;color:#1A120B;background:#fff;margin:16px 0">${lead.vorschau}</blockquote>` : ""}
        <p style="margin-top:24px">
          <a href="${leadUrl}" style="background:#1A120B;color:#FAF5E9;padding:12px 28px;text-decoration:none;letter-spacing:0.15em;text-transform:uppercase;font-size:12px;display:inline-block">
            Lead öffnen
          </a>
        </p>
        <p style="font-size:11px;color:#7A6A55;margin-top:32px;border-top:1px solid #C9B89A;padding-top:12px">
          Diese Benachrichtigung wird max. 1×/15min versendet. Im Admin: /admin/einstellungen für Notification-Settings.
        </p>
      </div>
    `;

    for (const admin of admins) {
      try {
        if (await bereitsBenachrichtigt(admin.id, "new_lead")) continue;
        await sendEmail({
          to:      [{ email: admin.email, name: admin.name ?? undefined }],
          subject,
          htmlContent,
          tags:    ["lead-notification"],
        });
        await logNotification(admin.id, "email", "new_lead", lead.id);
      } catch (err) {
        console.error("[notifyNewLead]", admin.email, err);
      }
    }
  } catch (err) {
    console.error("[notifyNewLead] unexpected", err);
  }
}

/** Zähler für Header-Bell / Sidebar-Badge: ungelesene Leads (status=neu) */
export async function ungeleseneCount(): Promise<number> {
  const r = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM sebo.leads WHERE status = 'neu'`
  );
  return r.rows[0]?.count ?? 0;
}
