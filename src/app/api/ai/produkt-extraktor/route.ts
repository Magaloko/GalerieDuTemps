import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { extrahiereProduktDaten, ExtraktorError } from "@/lib/ai/produkt-extraktor";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Нет прав" }, { status: 403 });

  // Rate-Limit: 30 Extraktionen / Stunde / Admin
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`ai-extract:${session.user.id}:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let notizen: string;
  let preisHint: string | undefined;
  let kategorieHint: string | undefined;
  try {
    const body = await req.json();
    notizen       = String(body.notizen ?? "");
    preisHint     = body.preis_hint ? String(body.preis_hint).slice(0, 50) : undefined;
    kategorieHint = body.kategorie   ? String(body.kategorie).slice(0, 50)  : undefined;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  try {
    const parsed = await extrahiereProduktDaten(notizen, { preisHint, kategorieHint });
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof ExtraktorError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[ai-extract]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI-Fehler" }, { status: 500 });
  }
}
