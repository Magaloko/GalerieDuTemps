"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { customerByEmail } from "@/lib/db/customers";
import { customerPasswortAendern } from "@/lib/db/customer-auth";

const Schema = z.object({
  altes_passwort:    z.string().min(1),
  neues_passwort:    z.string().min(8, "Минимум 8 символов"),
  neues_passwort_wdh:z.string(),
}).refine(d => d.neues_passwort === d.neues_passwort_wdh, {
  message: "Пароли не совпадают",
  path:    ["neues_passwort_wdh"],
});

export async function passwortAendernAction(
  _prev: { ok?: boolean; fehler?: string } | null,
  formData: FormData
): Promise<{ ok?: boolean; fehler?: string }> {
  const session = await auth();
  if (!session || session.user?.role !== "customer") return { fehler: "Вы не авторизованы" };

  const parsed = Schema.safeParse({
    altes_passwort:    formData.get("altes_passwort"),
    neues_passwort:    formData.get("neues_passwort"),
    neues_passwort_wdh:formData.get("neues_passwort_wdh"),
  });
  if (!parsed.success) {
    return { fehler: parsed.error.issues[0]?.message ?? "Неверный ввод" };
  }

  const customer = await customerByEmail(session.user.email!);
  if (!customer || !customer.passwort_hash) return { fehler: "Аккаунт не найден" };

  const ok = await bcrypt.compare(parsed.data.altes_passwort, customer.passwort_hash);
  if (!ok) return { fehler: "Текущий пароль неверен" };

  const neuerHash = await bcrypt.hash(parsed.data.neues_passwort, 12);
  await customerPasswortAendern(session.user.id, neuerHash);

  return { ok: true };
}
