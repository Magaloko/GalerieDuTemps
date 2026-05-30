/* ──────────────────────────────────────────────────────────────────────────
 * Module-Base — dieselben Operator-Module unter /admin UND /app servieren.
 *
 * Die Modul-Seiten teilen sich denselben Code-Body (Re-Export). Damit Links/
 * Redirects in der jeweils gerenderten Hülle bleiben (nicht aus /app nach
 * /admin springen), bauen wir Navigations-Pfade über eine Basis:
 *   getModuleBase()  → "/app" | "/admin"   (Server, ./module-base-server)
 *   useModuleBase()  → dito                 (Client, ./module-base-client)
 *
 * Diese Datei ist PUR (kein next/headers, kein "use client") → von beiden
 * Seiten importierbar.
 * ────────────────────────────────────────────────────────────────────────── */

export type ModuleBase = "/app" | "/admin";

/**
 * Baut einen Modul-Pfad an der aktuellen Basis. `path` wird OHNE führendes
 * /admin oder /app angegeben (führendes /admin oder /app wird toleriert + entfernt).
 *   mhref("/app",   "/produkte/123")      → "/app/produkte/123"
 *   mhref("/admin", "/admin/produkte/123") → "/admin/produkte/123"
 */
export function mhref(base: ModuleBase, path: string): string {
  const clean = path.replace(/^\/(admin|app)(?=\/|$)/, "");
  return base + (clean.startsWith("/") ? clean : "/" + clean);
}
