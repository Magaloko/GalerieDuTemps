"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { stageAktualisieren } from "@/lib/db/crm";

export async function stageVerschiebenAction(customerId: string, stageId: number): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
  await stageAktualisieren(customerId, stageId);
  revalidatePath("/admin/crm/pipeline");
}
