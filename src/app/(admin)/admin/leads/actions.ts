"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/config";
import {
  leadStatusAendern,
  leadPrioritaetAendern,
  leadZuweisen,
  leadKommentarHinzufuegen,
  leadKonvertierenZuCustomer,
  type LeadStatus,
  type LeadPrioritaet,
} from "@/lib/db/leads";
import { customerByEmail, customerErstellen } from "@/lib/db/customers";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

export async function leadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadStatusAendern(leadId, status, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadPrioritaetAction(
  leadId: string,
  prioritaet: LeadPrioritaet
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadPrioritaetAendern(leadId, prioritaet, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadZuweisenAction(
  leadId: string,
  benutzer_id: string | null
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  await leadZuweisen(leadId, benutzer_id, session.user.id);
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function leadNotizAction(
  leadId:  string,
  text:    string,
  richtung: "outbound" | "interne_notiz"
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };
  const trimmed = text.trim();
  if (trimmed.length < 1) return { ok: false, error: "Leere Nachricht" };
  await leadKommentarHinzufuegen(leadId, trimmed.slice(0, 5000), session.user.id, richtung);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function leadAlsCustomerAnlegenAction(
  leadId: string,
  email:  string,
  name:   string
): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!session) return { ok: false, error: "Нет прав" };

  const lcEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lcEmail)) {
    return { ok: false, error: "Ungültige E-Mail" };
  }

  let custId: string;
  const existing = await customerByEmail(lcEmail);
  if (existing) {
    custId = existing.id;
  } else {
    const created = await customerErstellen({
      email:          lcEmail,
      vorname:        name.split(" ")[0] ?? "",
      nachname:       name.split(" ").slice(1).join(" ") ?? undefined,
      agb_akzeptiert: false,
    });
    custId = created.id;
  }
  await leadKonvertierenZuCustomer(leadId, custId);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Customer verlinkt" };
}
