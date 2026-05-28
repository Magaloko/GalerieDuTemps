import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { bildSha256Existiert } from "@/lib/db/bilder";

export const dynamic = "force-dynamic";

/* GET /api/bilder/dedup?hash=<sha256> — prüft, ob ein Bild mit diesem Hash
 * bereits existiert (Dedup beim Massen-Upload). Nur Admin. */
export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const hash = req.nextUrl.searchParams.get("hash")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    return NextResponse.json({ duplicate: false });
  }
  try {
    const treffer = await bildSha256Existiert(hash);
    return NextResponse.json(
      treffer
        ? { duplicate: true, produktId: treffer.produktId, name: treffer.produktName }
        : { duplicate: false },
    );
  } catch (err) {
    console.error("[api/bilder/dedup]", err);
    return NextResponse.json({ duplicate: false });
  }
}
