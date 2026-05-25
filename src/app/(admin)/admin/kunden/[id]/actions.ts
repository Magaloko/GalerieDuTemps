"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import {
  tagZuweisen, tagEntfernen, tagErstellen,
  noteErstellen, notePinnen, noteLoeschen,
  taskErstellen, taskStatusAendern, taskLoeschen,
  stageAktualisieren, dncSetzen,
} from "@/lib/db/crm";
import type { TaskStatus, TaskPrioritaet } from "@/types/crm";

async function adminCheck() {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    throw new Error("Nicht berechtigt");
  }
  return session.user.id;
}

// ─── TAGS ────────────────────────────────────────────────────────────────
export async function tagAssignAction(customerId: string, tagId: number): Promise<void> {
  const adminId = await adminCheck();
  await tagZuweisen(customerId, tagId, adminId);
  revalidatePath(`/admin/kunden/${customerId}`);
}

export async function tagRemoveAction(customerId: string, tagId: number): Promise<void> {
  await adminCheck();
  await tagEntfernen(customerId, tagId);
  revalidatePath(`/admin/kunden/${customerId}`);
}

export async function tagCreateAction(name: string, farbe: string): Promise<{ ok?: boolean; fehler?: string }> {
  await adminCheck();
  if (!name.trim()) return { fehler: "Name erforderlich" };
  try {
    await tagErstellen({ name, farbe });
    revalidatePath(`/admin/kunden`, "layout");
    return { ok: true };
  } catch {
    return { fehler: "Tag existiert bereits oder Fehler" };
  }
}

// ─── NOTES ───────────────────────────────────────────────────────────────
export async function noteCreateAction(customerId: string, inhalt: string): Promise<void> {
  const adminId = await adminCheck();
  if (!inhalt.trim()) return;
  await noteErstellen({ customer_id: customerId, inhalt, erstellt_von: adminId });
  revalidatePath(`/admin/kunden/${customerId}`);
}

export async function notePinAction(noteId: string, customerId: string, pinned: boolean): Promise<void> {
  await adminCheck();
  await notePinnen(noteId, pinned);
  revalidatePath(`/admin/kunden/${customerId}`);
}

export async function noteDeleteAction(noteId: string, customerId: string): Promise<void> {
  await adminCheck();
  await noteLoeschen(noteId);
  revalidatePath(`/admin/kunden/${customerId}`);
}

// ─── TASKS ───────────────────────────────────────────────────────────────
export async function taskCreateAction(data: {
  customer_id?: string;
  titel:        string;
  beschreibung?: string;
  prioritaet?:  TaskPrioritaet;
  faellig_am?:  string;
}): Promise<{ ok?: boolean; fehler?: string }> {
  const adminId = await adminCheck();
  if (!data.titel.trim()) return { fehler: "Titel erforderlich" };
  await taskErstellen({
    titel:         data.titel,
    beschreibung:  data.beschreibung,
    customer_id:   data.customer_id,
    erstellt_von:  adminId,
    zugewiesen_an: adminId,
    prioritaet:    data.prioritaet,
    faellig_am:    data.faellig_am,
  });
  if (data.customer_id) revalidatePath(`/admin/kunden/${data.customer_id}`);
  revalidatePath(`/admin/crm/tasks`);
  return { ok: true };
}

export async function taskStatusAction(taskId: string, status: TaskStatus, customerId?: string): Promise<void> {
  await adminCheck();
  await taskStatusAendern(taskId, status);
  if (customerId) revalidatePath(`/admin/kunden/${customerId}`);
  revalidatePath(`/admin/crm/tasks`);
}

export async function taskDeleteAction(taskId: string, customerId?: string): Promise<void> {
  await adminCheck();
  await taskLoeschen(taskId);
  if (customerId) revalidatePath(`/admin/kunden/${customerId}`);
  revalidatePath(`/admin/crm/tasks`);
}

// ─── STAGE ───────────────────────────────────────────────────────────────
export async function stageSetAction(customerId: string, stageId: number): Promise<void> {
  await adminCheck();
  await stageAktualisieren(customerId, stageId);
  revalidatePath(`/admin/kunden/${customerId}`);
}

// ─── DNC ─────────────────────────────────────────────────────────────────
export async function dncAction(customerId: string, grund?: string): Promise<void> {
  await adminCheck();
  await dncSetzen(customerId, grund);
  revalidatePath(`/admin/kunden/${customerId}`);
}
