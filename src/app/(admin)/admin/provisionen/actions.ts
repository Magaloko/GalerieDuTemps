"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";
import { provisionenStornieren } from "@/lib/db/provisionen";
import { sendEmail } from "@/lib/email/brevo";
import { provisionStorniertMail } from "@/lib/email/affiliate-templates";

/**
 * Storniert alle Provisionen einer Kontaktanfrage (z.B. bei Retoure)
 * + benachrichtigt betroffene Affiliates
 */
export async function provisionenStornierenAction(
  kontaktanfrageId: string,
  grund: string
): Promise<{ anzahl: number; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { anzahl: 0, fehler: "Нет прав" };
  }
  if (!grund.trim() || grund.length < 5) {
    return { anzahl: 0, fehler: "Укажите причину (минимум 5 символов)" };
  }

  // Vor dem Stornieren: betroffene Affiliates laden
  const betroffeneRes = await query<{
    email:       string;
    vorname:     string;
    nachname:    string;
    betrag_cent: number;
  }>(
    `SELECT a.email, a.vorname, a.nachname, p.betrag_cent
     FROM sebo.provisionen p
     JOIN sebo.affiliates  a ON a.id = p.affiliate_id
     WHERE p.kontaktanfrage_id = $1
       AND p.status IN ('offen', 'bestaetigt')`,
    [kontaktanfrageId]
  );

  const anzahl = await provisionenStornieren(kontaktanfrageId, grund);

  // Mails parallel versenden
  await Promise.allSettled(
    betroffeneRes.rows.map(b =>
      sendEmail({
        to:      [{ email: b.email, name: `${b.vorname} ${b.nachname}` }],
        subject: "Provision storniert – Galerie du Temps",
        htmlContent: provisionStorniertMail({
          vorname:    b.vorname,
          betragCent: b.betrag_cent,
          grund,
        }),
        tags:    ["affiliate-storno"],
      }).catch(err => console.error("[Storno] Brevo:", err))
    )
  );

  // Kontaktanfrage-Status zurücksetzen (verkauft → archiviert)
  await query(
    `UPDATE sebo.kontaktanfragen
     SET status = 'archiviert', verkaufspreis_cent = NULL, verkauft_am = NULL
     WHERE id = $1`,
    [kontaktanfrageId]
  );

  revalidatePath("/admin/provisionen");
  revalidatePath("/admin/kontakt");

  return { anzahl };
}
