import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { dateiLoeschen } from "@/lib/db/produkt-medien";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });

  const { id } = await params;
  const ok = await dateiLoeschen(id);
  return ok
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
}
