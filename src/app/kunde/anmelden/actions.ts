"use server";

import { loginWithRoleRedirect, type LoginResult } from "@/lib/auth/login-redirect";

export async function customerLoginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<LoginResult> {
  return loginWithRoleRedirect(formData, "/kunde");
}
