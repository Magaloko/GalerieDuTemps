"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/config";
import { segmentErstellen, segmentLoeschen, segmentVorschau } from "@/lib/db/crm";
import type { SegmentFilter } from "@/types/crm";

export async function segmentCreateAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return { fehler: "Нет прав" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { fehler: "Укажите название" };

  const filter: SegmentFilter = {};

  const types = formData.getAll("customer_type").map(String).filter(Boolean);
  if (types.length > 0) filter.customer_type = types;

  const stageId = formData.get("stage_id");
  if (stageId) filter.stage_id = parseInt(String(stageId), 10);

  if (formData.get("newsletter") === "yes")  filter.newsletter = true;
  if (formData.get("newsletter") === "no")   filter.newsletter = false;

  const minOrders = formData.get("min_orders");
  if (minOrders)  filter.min_orders = parseInt(String(minOrders), 10);

  const minSumme = formData.get("min_summe_eur");
  if (minSumme)   filter.min_summe_cent = Math.round(parseFloat(String(minSumme)) * 100);

  try {
    await segmentErstellen({
      name,
      beschreibung: String(formData.get("beschreibung") ?? "") || undefined,
      filter,
      erstellt_von: session.user.id,
    });
    revalidatePath("/admin/crm/segments");
    return { ok: true };
  } catch {
    return { fehler: "Не удалось создать" };
  }
}

export async function segmentLoeschenAction(id: string): Promise<void> {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) return;
  await segmentLoeschen(id);
  revalidatePath("/admin/crm/segments");
}

export async function segmentVorschauAction(filter: SegmentFilter): Promise<{ treffer: number }> {
  await auth();
  const r = await segmentVorschau(filter, 1);
  return { treffer: r.treffer };
}
