"use server";

import { loginWithRoleRedirect, type LoginResult } from "@/lib/auth/login-redirect";

export async function affiliateLoginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRoleRedirect(formData, "/affiliate");
}
