import { cookies } from "next/headers";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-View-Preference
 *
 * Zwei Operator-Ansichten teilen sich die gleichen Module:
 *   • "app"     — mobile-first App-Shell unter /app (Default, Bottom-Tabs)
 *   • "classic" — klassisches Desktop-Admin unter /admin (Sidebar)
 *
 * Cookie  : gdt_admin_view
 * Default : "app"  → wenn Cookie fehlt, gilt App-Ansicht.
 *
 * Telegram-Mini-App (/tg) ist davon UNberührt.
 * ────────────────────────────────────────────────────────────────────────── */

export type AdminView = "app" | "classic";

export const ADMIN_VIEW_COOKIE = "gdt_admin_view";
export const ADMIN_VIEW_DEFAULT: AdminView = "app";

/** Home-Pfad pro Ansicht — was Login-Redirects / Toggles ansteuern. */
export const ADMIN_VIEW_HOME: Record<AdminView, string> = {
  app:     "/app",
  classic: "/admin",
};

export function parseAdminView(value: string | undefined | null): AdminView {
  return value === "classic" ? "classic" : ADMIN_VIEW_DEFAULT;
}

/** Liest die aktuelle Operator-View aus Cookies (Server). */
export async function getAdminView(): Promise<AdminView> {
  const c = await cookies();
  return parseAdminView(c.get(ADMIN_VIEW_COOKIE)?.value);
}
