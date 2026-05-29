"use server";

import { z } from "zod";
import { getDictionary } from "@/i18n";
import { getSiteUrl } from "@/lib/site-url";

const KontaktSchema = z.object({
  name:      z.string().min(2),
  email:     z.string().email(),
  betreff:   z.string().optional(),
  nachricht: z.string().min(10),
});

export type KontaktState = { ok?: boolean; error?: string } | null;

export async function kontaktSendenAction(
  _prev: KontaktState,
  formData: FormData
): Promise<KontaktState> {
  const { t } = await getDictionary();

  const parsed = KontaktSchema.safeParse({
    name:      formData.get("name"),
    email:     formData.get("email"),
    betreff:   formData.get("betreff"),
    nachricht: formData.get("nachricht"),
  });

  if (!parsed.success) return { error: t.kontakt_seite.fehler };

  try {
    const res  = await fetch(`${getSiteUrl()}/api/kontakt`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(parsed.data),
    });
    if (!res.ok) throw new Error("API-Fehler");
    return { ok: true };
  } catch {
    return { error: t.kontakt_seite.sende_fehler };
  }
}
