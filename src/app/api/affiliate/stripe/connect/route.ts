import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { generateConnectUrl } from "@/lib/affiliate/stripe";

export const dynamic = "force-dynamic";

/** Leitet Affiliate zu Stripe Connect OAuth weiter */
export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") {
    return NextResponse.redirect(new URL("/affiliate/anmelden", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const url = generateConnectUrl(session.user.id);
  if (!url) {
    return NextResponse.redirect(new URL("/affiliate/profil?stripe=not_configured", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  return NextResponse.redirect(url);
}
