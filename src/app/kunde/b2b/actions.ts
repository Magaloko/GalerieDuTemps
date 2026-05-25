"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { b2bAntragAktualisieren } from "@/lib/db/customer-b2b";

const Schema = z.object({
  company_name: z.string().min(2, "Firmenname erforderlich"),
  ust_id:       z.string().optional(),
  company_note: z.string().optional(),
}).refine(d => d.ust_id || (d.company_note && d.company_note.length > 10), {
  message: "USt-IdNr. oder Begründung erforderlich",
  path:    ["ust_id"],
});

export async function b2bAntragStellenAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || session.user?.role !== "customer") return { fehler: "Nicht angemeldet" };

  const parsed = Schema.safeParse({
    company_name: formData.get("company_name"),
    ust_id:       formData.get("ust_id"),
    company_note: formData.get("company_note"),
  });
  if (!parsed.success) {
    return { fehler: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  await b2bAntragAktualisieren(session.user.id, {
    company_name: parsed.data.company_name,
    ust_id:       parsed.data.ust_id,
    company_note: parsed.data.company_note,
  });

  revalidatePath("/kunde/b2b");
  return { ok: true };
}
