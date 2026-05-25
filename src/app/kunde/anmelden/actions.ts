"use server";

import { signIn } from "@/lib/auth/config";
import { AuthError } from "next-auth";

export async function customerLoginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/kunde",
    });
    return { error: "" };
  } catch (err) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
    if (err instanceof AuthError) {
      return { error: "E-Mail oder Passwort falsch — oder E-Mail noch nicht bestätigt." };
    }
    return { error: "Unbekannter Fehler. Bitte erneut versuchen." };
  }
}
