"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  affiliateFreischalten,
  affiliateSperren,
  affiliateById,
} from "@/lib/db/affiliates";
import { sendEmail } from "@/lib/email/brevo";

/** Affiliate freischalten + Mail senden */
export async function freischaltenAction(id: string): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Nicht berechtigt");
  }

  await affiliateFreischalten(id, session.user.id);
  const aff = await affiliateById(id);
  if (aff) {
    sendEmail({
      to:      [{ email: aff.email, name: `${aff.vorname} ${aff.nachname}` }],
      subject: "Du bist jetzt aktiver Galerie du Temps Partner",
      htmlContent: freischaltMail(aff.vorname, aff.referral_code),
      tags:    ["affiliate-aktiviert"],
    }).catch(err => console.error("[Freischaltung] Brevo:", err));
  }

  revalidatePath("/admin/affiliates");
  revalidatePath(`/admin/affiliates/${id}`);
}

/** Affiliate sperren */
export async function sperrenAction(id: string, grund: string): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Nicht berechtigt");
  }
  await affiliateSperren(id, grund);
  revalidatePath("/admin/affiliates");
  revalidatePath(`/admin/affiliates/${id}`);
}

function freischaltMail(vorname: string, code: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <body style="font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #FDFAF5; border: 1px solid #C9B89A; padding: 48px;">
        <p style="color: #C9A84C; font-size: 20px; text-align: center; margin: 0 0 8px;">✦</p>
        <h1 style="color: #4A2C1A; font-size: 28px; text-align: center; margin: 0 0 16px; font-weight: normal;">
          Du bist freigeschaltet!
        </h1>
        <p style="color: #4A2C1A; line-height: 1.7;">
          Hallo ${vorname},<br><br>
          dein Partner-Account ist jetzt aktiv. Du kannst dich anmelden und sofort
          deine ersten Empfehlungs-Links erstellen.
        </p>
        <div style="background: #E8DFD0; border-left: 3px solid #C9A84C; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0; color: #8B6F47; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Dein Code</p>
          <p style="margin: 8px 0 0; color: #4A2C1A; font-family: monospace; font-size: 24px; letter-spacing: 4px;">${code}</p>
        </div>
        <p style="text-align: center; margin: 32px 0;">
          <a href="https://galeriedutemps.kz/affiliate" style="display: inline-block; padding: 14px 32px; background: #4A2C1A; color: #F5F0E8; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">
            Zum Partner-Bereich
          </a>
        </p>
        <p style="color: #8B6F47;">Viel Erfolg!<br><strong style="color: #4A2C1A;">Galerie du Temps Team</strong></p>
      </div>
    </body>
    </html>
  `.trim();
}
