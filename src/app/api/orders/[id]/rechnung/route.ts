import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { orderById } from "@/lib/db/orders";
import { rechnungZuOrder } from "@/lib/db/invoices";

export const dynamic = "force-dynamic";

/**
 * Liefert die Rechnung für eine Order (HTML/PDF Print-Sicht).
 * - Customer sieht nur eigene
 * - Admin sieht alle
 * - Anonyme: nicht erlaubt
 *
 * Erstellt Invoice-Row falls noch nicht vorhanden.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/kunde/anmelden", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const order = await orderById(id);
  if (!order) return NextResponse.json({ error: "Bestellung nicht gefunden" }, { status: 404 });

  const role = session.user.role;
  const istAdmin = role === "admin" || role === "superadmin";
  const istEigene = order.customer_id === session.user.id;

  if (!istAdmin && !istEigene) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  // Invoice-Row erstellen falls noch nicht (nur wenn Order >= paid)
  if (order.status !== "pending" && order.status !== "cancelled") {
    await rechnungZuOrder(id).catch(() => null);
  }

  // Redirect auf druckbare HTML-Seite
  return NextResponse.redirect(new URL(`/rechnung/${id}`, process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
