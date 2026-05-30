"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_VIEW_COOKIE,
  ADMIN_VIEW_HOME,
  parseAdminView,
} from "@/lib/admin-view";

/* ──────────────────────────────────────────────────────────────────────────
 * setAdminViewAction — Operator-View umschalten.
 *
 * Wird vom ViewSwitch in der Top-Bar (App-Shell + Admin-Layout) per Form
 * aufgerufen. Setzt das gdt_admin_view-Cookie und redirected zur Home-Route
 * der Zielansicht (/app oder /admin).
 *
 * Sicher in Server-Action: nur write auf eigenes Preference-Cookie, keine
 * PII, keine DB. 180 Tage TTL, httpOnly=false damit das Cookie auch im UI
 * (falls je nötig) lesbar wäre — relevant ist v. a. der Server-Read.
 * ────────────────────────────────────────────────────────────────────────── */
export async function setAdminViewAction(formData: FormData): Promise<void> {
  const view = parseAdminView(String(formData.get("view") ?? ""));

  const c = await cookies();
  c.set(ADMIN_VIEW_COOKIE, view, {
    path:     "/",
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 180,
  });

  redirect(ADMIN_VIEW_HOME[view]);
}
