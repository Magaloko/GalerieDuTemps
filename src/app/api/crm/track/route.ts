import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { eventLoggen } from "@/lib/db/crm";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

const TrackSchema = z.object({
  typ:   z.string().min(2).max(50),
  daten: z.record(z.string(), z.unknown()).optional(),
});

/** Event-Tracking-Endpunkt (anonyme + Customer-Events) */
export async function POST(req: NextRequest) {
  // Rate-Limit: 100 Events / Min / IP (Spam-Schutz)
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`crm-track:${ip}`, 100, 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl) as unknown as NextResponse;

  try {
    const body   = await req.json();
    const parsed = TrackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ungültiges Event" }, { status: 400 });
    }

    const session = await auth();
    const customer_id    = session?.user?.role === "customer" ? session.user.id    : undefined;
    const customer_email = session?.user?.role === "customer" ? (session.user.email ?? undefined) : undefined;

    await eventLoggen({
      customer_id,
      customer_email,
      typ:    parsed.data.typ,
      daten:  parsed.data.daten,
      quelle: "web",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[CRM Track]", err);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
