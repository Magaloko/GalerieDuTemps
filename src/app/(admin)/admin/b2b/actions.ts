"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { b2bFreischalten, b2bAblehnen } from "@/lib/db/customer-b2b";
import { customerById } from "@/lib/db/customers";
import { sendEmail } from "@/lib/email/brevo";
import { b2bApprovedMail, b2bRejectMail } from "@/lib/email/customer-templates";

export async function b2bFreischaltenAction(
  customerId: string,
  willkommensCoupon?: string
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }

  await b2bFreischalten(customerId);

  const cust = await customerById(customerId);
  if (cust) {
    sendEmail({
      to:      [{ email: cust.email, name: `${cust.vorname ?? ""} ${cust.nachname ?? ""}` }],
      subject: "B2B-Account freigeschaltet – Galerie du Temps",
      htmlContent: b2bApprovedMail(cust.vorname ?? "", willkommensCoupon),
      tags:    ["b2b-approved"],
    }).catch(err => console.error("[B2B Approve] Brevo:", err));
  }

  revalidatePath("/admin/b2b");
  return { ok: true };
}

export async function b2bAblehnenAction(
  customerId: string,
  grund: string
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }
  if (!grund.trim() || grund.length < 5) {
    return { fehler: "Укажите причину минимум из 5 символов" };
  }

  await b2bAblehnen(customerId, grund);

  const cust = await customerById(customerId);
  if (cust) {
    sendEmail({
      to:      [{ email: cust.email, name: `${cust.vorname ?? ""} ${cust.nachname ?? ""}` }],
      subject: "B2B-Antrag abgelehnt – Galerie du Temps",
      htmlContent: b2bRejectMail(cust.vorname ?? "", grund),
      tags:    ["b2b-rejected"],
    }).catch(err => console.error("[B2B Reject] Brevo:", err));
  }

  revalidatePath("/admin/b2b");
  return { ok: true };
}
