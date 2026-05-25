import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Stripe-Verbindung trennen */
export async function POST() {
  const session = await auth();
  if (!session || session.user?.role !== "affiliate") {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  await query(
    `UPDATE sebo.affiliates
     SET stripe_account_id = NULL,
         stripe_payouts_enabled = false,
         stripe_charges_enabled = false,
         stripe_connected_am = NULL
     WHERE id = $1`,
    [session.user.id]
  );

  return NextResponse.json({ ok: true });
}
