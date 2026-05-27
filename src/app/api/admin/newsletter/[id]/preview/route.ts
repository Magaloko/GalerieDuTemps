import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { newsletterById } from "@/lib/db/newsletter";
import { renderNewsletter } from "@/lib/newsletter/render";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const n = await newsletterById(id);
  if (!n) return new NextResponse("Not found", { status: 404 });

  const baseUrl = getSiteUrl();
  const html = renderNewsletter(n.blocks ?? [], {
    unsubscribe_url: `${baseUrl}/api/newsletter/unsubscribe?token=preview`,
    basis_url:       baseUrl,
  });

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
