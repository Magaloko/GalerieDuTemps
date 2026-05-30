"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getModuleBase } from "@/lib/module-base-server";
import { auth } from "@/lib/auth/config";
import {
  newsletterErstellen, newsletterAktualisieren, newsletterLoeschen,
  newsletterEmpfaengerSammeln, newsletterSendBuchen, newsletterAlsVersendetMarkieren,
  newsletterById, subscriberLoeschen,
} from "@/lib/db/newsletter";
import { sendEmail } from "@/lib/email";
import { renderNewsletter } from "@/lib/newsletter/render";
import { getSiteUrl } from "@/lib/site-url";
import type { NewsletterBlock } from "@/types/newsletter";

async function adminCheck() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Нет прав");
  }
  return session.user.id;
}

export async function newsletterCreateAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const adminId = await adminCheck();
  const titel   = String(formData.get("titel") ?? "").trim();
  const betreff = String(formData.get("betreff") ?? titel).trim();
  if (titel.length < 2) return { fehler: "Укажите название" };

  const n = await newsletterErstellen({ titel, betreff, erstellt_von: adminId });
  const base = await getModuleBase();
  redirect(`${base}/newsletter/${n.id}/edit`);
}

export async function newsletterUpdateAction(id: string, data: {
  titel?:     string;
  betreff?:   string;
  preheader?: string;
  blocks?:    NewsletterBlock[];
  segment_id?: string | null;
}): Promise<{ ok?: boolean }> {
  await adminCheck();
  await newsletterAktualisieren(id, data);
  revalidatePath(`/admin/newsletter/${id}/edit`);
  return { ok: true };
}

export async function newsletterDeleteAction(id: string): Promise<void> {
  await adminCheck();
  await newsletterLoeschen(id);
  revalidatePath("/admin/newsletter");
}

/** Test-Versand an eine E-Mail-Adresse */
export async function newsletterTestAction(id: string, email: string): Promise<{ ok?: boolean; fehler?: string }> {
  await adminCheck();
  const n = await newsletterById(id);
  if (!n) return { fehler: "Рассылка не найдена" };

  const baseUrl = getSiteUrl();
  const html = renderNewsletter(n.blocks ?? [], {
    unsubscribe_url: `${baseUrl}/api/newsletter/unsubscribe?token=test`,
    basis_url:       baseUrl,
  });

  try {
    await sendEmail({
      to:          [{ email, name: "Test" }],
      subject:     `[TEST] ${n.betreff}`,
      htmlContent: html,
      tags:        ["newsletter-test"],
    });
    return { ok: true };
  } catch (err) {
    return { fehler: err instanceof Error ? err.message : "Ошибка" };
  }
}

/** Vollversand an alle Subscriber (optional gefiltert) */
export async function newsletterVersendenAction(id: string): Promise<{ ok?: boolean; anzahl?: number; fehler?: string }> {
  await adminCheck();
  const n = await newsletterById(id);
  if (!n) return { fehler: "Рассылка не найдена" };
  if (n.status === "versendet") return { fehler: "Уже отправлено" };

  const empfaenger = await newsletterEmpfaengerSammeln(n.segment_id ?? undefined);
  if (empfaenger.length === 0) return { fehler: "Нет получателей" };

  const baseUrl = getSiteUrl();

  // Pro Empfänger: rendern (mit individuellem Unsubscribe-Link) + senden + buchen
  let erfolgreich = 0;
  for (const e of empfaenger) {
    const html = renderNewsletter(n.blocks ?? [], {
      unsubscribe_url: `${baseUrl}/api/newsletter/unsubscribe?token=${e.unsubscribe_token}`,
      vorname:         e.vorname ?? undefined,
      basis_url:       baseUrl,
    });
    try {
      await sendEmail({
        to:          [{ email: e.email, name: e.vorname ?? "" }],
        subject:     n.betreff,
        htmlContent: html,
        tags:        ["newsletter", `nl-${id.slice(0, 8)}`],
      });
      await newsletterSendBuchen({
        newsletter_id:  id,
        email:          e.email,
        subscriber_id:  e.subscriber_id ?? undefined,
        customer_id:    e.customer_id ?? undefined,
      });
      erfolgreich++;
    } catch (err) {
      console.error("[Newsletter Send]", e.email, err);
    }
  }

  await newsletterAlsVersendetMarkieren(id, erfolgreich);
  revalidatePath("/admin/newsletter");
  return { ok: true, anzahl: erfolgreich };
}

// Subscriber-Aktionen
export async function subscriberDeleteAction(id: string): Promise<void> {
  await adminCheck();
  await subscriberLoeschen(id);
  revalidatePath("/admin/newsletter/subscribers");
}
