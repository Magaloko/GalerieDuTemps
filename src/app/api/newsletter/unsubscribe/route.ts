import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/db/newsletter";

export const dynamic = "force-dynamic";

/** GET-Form: Klick aus E-Mail-Footer → ?token=... */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/newsletter/abgemeldet?error=1", req.nextUrl));
  }
  await unsubscribeByToken(token, "Per 1-Klick-Link").catch(() => false);
  return NextResponse.redirect(new URL("/newsletter/abgemeldet", req.nextUrl));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = body.token;
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
  const ok = await unsubscribeByToken(token).catch(() => false);
  return NextResponse.json({ ok });
}
