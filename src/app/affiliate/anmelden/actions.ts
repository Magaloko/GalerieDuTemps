"use server";

import { signIn } from "@/lib/auth/config";
import { AuthError } from "next-auth";

export async function affiliateLoginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/affiliate",
    });
    return { error: "" };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;

    if (err instanceof AuthError) {
      switch (err.type) {
        case "CredentialsSignin":
          return { error: "E-Mail oder Passwort ist falsch (oder dein Account ist noch nicht freigeschaltet)." };
        default:
          return { error: "Anmeldung fehlgeschlagen. Bitte erneut versuchen." };
      }
    }
    console.error("[Affiliate-Login]", err);
    return { error: "Unbekannter Fehler. Bitte erneut versuchen." };
  }
}
