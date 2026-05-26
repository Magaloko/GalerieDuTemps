import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

/* ──────────────────────────────────────────────────────────────────────────
 * /post-login
 *
 * Zwischenstopp nach erfolgreichem signIn(). Liest die jetzt verfügbare
 * Session (Cookie wurde im vorherigen Request gesetzt) und routet je nach
 * Rolle zum richtigen Dashboard. Wenn ?fallback=... übergeben wird und kein
 * Rollen-Match passt, wird der Fallback genommen — sonst landet der User
 * stumpf auf /.
 *
 * Diese Route hat KEINEN UI-Inhalt — sie redirected serverseitig und der
 * Browser sieht nur eine 307-Response.
 * ────────────────────────────────────────────────────────────────────────── */

const ROLE_HOME: Record<string, string> = {
  superadmin: "/admin",
  admin:      "/admin",
  affiliate:  "/affiliate",
  customer:   "/kunde",
};

export const dynamic = "force-dynamic";

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp       = await searchParams;
  const fallback = (typeof sp.fallback === "string" ? sp.fallback : null) ?? "/";
  const session  = await auth();

  // Sicherheits-Whitelist: fallback muss eine relative URL sein, kein offener Redirect.
  const safeFallback = fallback.startsWith("/") && !fallback.startsWith("//") ? fallback : "/";

  if (!session?.user) {
    // Cookie nicht gesetzt → zurück zum Login
    redirect("/login?error=session");
  }

  const role   = session.user.role;
  const target = (role && ROLE_HOME[role]) || safeFallback;
  redirect(target);
}
