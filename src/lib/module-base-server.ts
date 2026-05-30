import "server-only";
import { headers } from "next/headers";
import type { ModuleBase } from "./module-base";

/* getModuleBase — Server-Erkennung der aktuellen Operator-Hülle.
 *
 * x-pathname-Header (von proxy.ts gesetzt) → Fallback referer → Default /admin.
 * Funktioniert in Server-Components UND Server-Actions (POST trägt dieselbe
 * Route bzw. referer). `base` immer VOR redirect() berechnen (redirect wirft). */
export async function getModuleBase(): Promise<ModuleBase> {
  const h = await headers();
  let p = h.get("x-pathname") ?? "";
  if (!p) {
    try { p = new URL(h.get("referer") ?? "").pathname; } catch { p = ""; }
  }
  return p.startsWith("/app") ? "/app" : "/admin";
}
