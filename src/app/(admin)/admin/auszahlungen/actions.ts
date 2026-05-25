"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  auszahlungErstellen,
  auszahlungAlsBezahltMarkieren,
} from "@/lib/db/auszahlungen";
import { affiliateById } from "@/lib/db/affiliates";
import { sendEmail } from "@/lib/email/brevo";
import { formatPreis } from "@/lib/utils/preis";

/**
 * Auszahlung für einen Affiliate erstellen.
 * Sammelt alle bestaetigt-Provisionen + setzt sie auf ausgezahlt.
 */
export async function auszahlungErstellenAction(
  affiliateId: string,
  methode:     "sepa" | "paypal"
): Promise<{ ok?: boolean; betrag_cent?: number; auszahlung_id?: string; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Nicht berechtigt" };
  }

  try {
    const auszahlung = await auszahlungErstellen({
      affiliate_id: affiliateId,
      methode,
      notiz:        `Erstellt von ${session.user.name ?? session.user.email}`,
    });

    if (!auszahlung) {
      return { fehler: "Keine bestätigten Provisionen für diesen Affiliate" };
    }

    revalidatePath("/admin/auszahlungen");
    return {
      ok:            true,
      betrag_cent:   auszahlung.betrag_cent,
      auszahlung_id: auszahlung.id,
    };
  } catch (err) {
    console.error("[Auszahlung erstellen]", err);
    return { fehler: "Fehler beim Erstellen der Auszahlung" };
  }
}

/**
 * Auszahlung als bezahlt markieren + Affiliate per Mail benachrichtigen
 */
export async function alsBezahltMarkierenAction(
  auszahlungId: string
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Nicht berechtigt" };
  }

  try {
    await auszahlungAlsBezahltMarkieren(auszahlungId, session.user.id);

    // Affiliate-Daten + Betrag laden für Mail
    const { query } = await import("@/lib/db");
    const detailRes = await query<{
      affiliate_id: string;
      betrag_cent:  number;
      methode:      string;
    }>(
      `SELECT affiliate_id, betrag_cent, methode FROM sebo.auszahlungen WHERE id = $1`,
      [auszahlungId]
    );
    const detail = detailRes.rows[0];

    if (detail) {
      const aff = await affiliateById(detail.affiliate_id);
      if (aff) {
        sendEmail({
          to:      [{ email: aff.email, name: `${aff.vorname} ${aff.nachname}` }],
          subject: `Auszahlung verbucht: ${formatPreis(detail.betrag_cent / 100)}`,
          htmlContent: `
            <!DOCTYPE html><html lang="de"><body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
              <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
                <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
                <h1 style="color: #4A2C1A; font-size: 28px; text-align: center; margin: 0 0 16px; font-weight: normal;">Auszahlung verbucht</h1>
                <p style="color: #4A2C1A;">Hallo ${aff.vorname},</p>
                <p style="color: #4A2C1A; line-height: 1.7;">Wir haben deine Auszahlung soeben veranlasst. Der Betrag sollte in den nächsten 1–3 Werktagen auf deinem Konto eingehen.</p>
                <div style="background: #4A2C1A; color: #FDFAF5; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0; color: #C9A84C; font-size: 11px; text-transform: uppercase; letter-spacing: 3px;">Auszahlungsbetrag</p>
                  <p style="margin: 12px 0 0; font-size: 36px; color: #C9A84C;">${formatPreis(detail.betrag_cent / 100)}</p>
                  <p style="margin: 8px 0 0; color: rgba(253,250,245,0.6); font-size: 12px;">via ${detail.methode.toUpperCase()}</p>
                </div>
                <p style="color: #8B6F47; line-height: 1.7;">Die Gutschrift findest du in deinem Partner-Dashboard.</p>
                <p style="text-align: center; margin: 32px 0;">
                  <a href="https://galeriedutemps.kz/affiliate/auszahlungen" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">Zur Übersicht</a>
                </p>
              </div>
            </body></html>
          `,
          tags: ["affiliate-auszahlung"],
        }).catch(err => console.error("[Bezahlt-Mail]", err));
      }
    }

    revalidatePath("/admin/auszahlungen");
    return { ok: true };
  } catch (err) {
    console.error("[Als bezahlt]", err);
    return { fehler: "Fehler beim Markieren" };
  }
}
