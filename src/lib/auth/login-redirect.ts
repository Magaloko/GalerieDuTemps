import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";
import { AuthError } from "next-auth";

export type LoginResult = { error: string };

const ROLE_HOME: Record<string, string> = {
  superadmin: "/admin",
  admin:      "/admin",
  affiliate:  "/affiliate",
  customer:   "/kunde",
};

function homeForRole(role: string | undefined, fallback: string): string {
  return (role && ROLE_HOME[role]) || fallback;
}

export async function loginWithRoleRedirect(
  formData: FormData,
  fallback: string
): Promise<LoginResult> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-Mail oder Passwort falsch — oder Account nicht freigeschaltet." };
    }
    console.error("[Auth] Login-Fehler:", err);
    return { error: "Unbekannter Fehler. Bitte erneut versuchen." };
  }

  const session = await auth();
  const target  = homeForRole(session?.user?.role, fallback);
  redirect(target);
}
