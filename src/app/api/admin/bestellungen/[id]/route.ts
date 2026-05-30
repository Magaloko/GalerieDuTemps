import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { orderById } from "@/lib/db/orders";

export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * GET /api/admin/bestellungen/[id]
 *
 * Liefert eine einzelne Bestellung (inkl. items) fürs Side-Peek-Slide-over
 * der Listen-Seite. Admin-only (NextAuth-Session). Bewusst schlank — nur
 * lesend, keine Mutation (Status-Änderung läuft über die Server-Action).
 * ────────────────────────────────────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
  }

  const order = await orderById(id).catch(() => null);
  if (!order) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  return NextResponse.json({ order });
}
