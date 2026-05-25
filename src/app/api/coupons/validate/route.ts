import { NextRequest, NextResponse } from "next/server";
import { couponValidieren } from "@/lib/db/coupons";
import { auth } from "@/lib/auth/config";
import { customerById } from "@/lib/db/customers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code           = String(body.code           ?? "");
    const subtotal_cents = Number(body.subtotal_cents ?? 0);

    if (!code || subtotal_cents <= 0) {
      return NextResponse.json({ ok: false, fehler: "Ungültige Anfrage" }, { status: 400 });
    }

    // Customer-Typ aus Session (wenn eingeloggt)
    let customer_type: "b2c" | "b2b_pending" | "b2b_verified" | "b2b_rejected" = "b2c";
    let customer_email: string | undefined;
    const session = await auth();
    if (session?.user?.role === "customer") {
      const cust = await customerById(session.user.id);
      if (cust) {
        customer_type  = cust.customer_type;
        customer_email = cust.email;
      }
    }

    const ergebnis = await couponValidieren({
      code,
      subtotal_cents,
      customer_type,
      customer_email,
    });

    return NextResponse.json(ergebnis);
  } catch (err) {
    console.error("[API /coupons/validate]", err);
    return NextResponse.json({ ok: false, fehler: "Serverfehler" }, { status: 500 });
  }
}
