import { signIn } from "@/lib/auth/config";
import { AuthError } from "next-auth";

export type LoginResult = { error: string };

/* ──────────────────────────────────────────────────────────────────────────
 * loginWithRoleRedirect
 *
 * Login + Rollen-basierter Redirect — in EINEM atomaren Schritt.
 *
 * Frühere Variante rief erst signIn(redirect:false), dann auth(), dann
 * redirect(). Problem: auth() las Cookies aus dem eingehenden Request —
 * den frisch gesetzten Session-Cookie sah es noch nicht, also war
 * session.user.role undefined → falscher Redirect-Target.
 *
 * Neu: signIn schreibt den Set-Cookie-Header UND macht den Redirect selbst
 * (NextAuth wirft intern eine spezielle Redirect-Exception die Next.js
 * propagiert). Damit ist Session-Cookie garantiert in der Response wenn
 * der Browser zum Target navigiert.
 *
 * Rollen-spezifischer Target: signIn akzeptiert nur EINE redirectTo URL,
 * wir kennen die Rolle noch nicht. Lösung: ein generischer /post-login
 * Endpoint der auth() lädt und je nach Rolle weiterleitet.
 * ────────────────────────────────────────────────────────────────────────── */
export async function loginWithRoleRedirect(
  formData: FormData,
  fallback: string
): Promise<LoginResult> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      // signIn führt selbst den Redirect aus (default), wirft NEXT_REDIRECT
      // welches Next.js fängt und zur Browser-Navigation übersetzt.
      // /post-login resolved dann je nach Rolle das richtige Target.
      redirectTo: `/post-login?fallback=${encodeURIComponent(fallback)}`,
    });
    // Unerreichbar — signIn wirft immer eine Redirect-Exception.
    return { error: "Непредвиденная ошибка. Попробуйте ещё раз." };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Неверный e-mail или пароль — либо аккаунт не активирован." };
    }
    // NEXT_REDIRECT-Errors müssen weiter-throwed werden, sonst geht der
    // Redirect verloren und der User landet wieder auf der Login-Page.
    throw err;
  }
}
