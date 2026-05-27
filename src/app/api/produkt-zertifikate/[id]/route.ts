import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { zertifikatLoeschen } from "@/lib/db/produkt-medien";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const { id } = await params;
  const ok = await zertifikatLoeschen(id);
  return ok
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
}
