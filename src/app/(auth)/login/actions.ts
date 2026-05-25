"use server";

import { signIn } from "@/lib/auth/config";
import { AuthError } from "next-auth";

// ---------------------------------------------------------------------------
// Server Action: Login
// ---------------------------------------------------------------------------
export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
    // signIn mit redirectTo wirft immer einen NEXT_REDIRECT – wird hier nicht erreicht
    return { error: "" };
  } catch (err) {
    // NEXT_REDIRECT weiterwerfen (ist kein echter Fehler)
    if (
      err instanceof Error &&
      (err.message === "NEXT_REDIRECT" || err.message.includes("NEXT_REDIRECT"))
    ) {
      throw err;
    }

    if (err instanceof AuthError) {
      switch (err.type) {
        case "CredentialsSignin":
          return { error: "E-Mail oder Passwort ist falsch." };
        case "CallbackRouteError":
          return { error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen." };
        default:
          return { error: "Ein Fehler ist aufgetreten. Bitte erneut versuchen." };
      }
    }

    console.error("[Auth] Unbekannter Login-Fehler:", err);
    return { error: "Unbekannter Fehler. Bitte erneut versuchen." };
  }
}
