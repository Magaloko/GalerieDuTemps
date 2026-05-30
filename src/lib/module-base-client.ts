"use client";
import { usePathname } from "next/navigation";
import type { ModuleBase } from "./module-base";

/* useModuleBase — Client-Erkennung der aktuellen Operator-Hülle (für Links in
 * Client-Komponenten, wo headers() nicht verfügbar ist). */
export function useModuleBase(): ModuleBase {
  const p = usePathname();
  return p.startsWith("/app") ? "/app" : "/admin";
}
