import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import {
  wunschlisteProdukte,
  wunschlisteHinzufuegen,
  wunschlisteEntfernen,
  wunschlisteIds,
} from "@/lib/db/wunschliste";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "wl_token";
const COOKIE_TTL  = 365 * 24 * 60 * 60; // 1 Jahr

async function getOrCreateToken(): Promise<string> {
  const jar   = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) return token;
  const neu = randomUUID();
  jar.set(COOKIE_NAME, neu, {
    httpOnly: true,
    maxAge:   COOKIE_TTL,
    path:     "/",
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
  });
  return neu;
}

/** GET – Wunschliste laden */
export async function GET() {
  try {
    const token   = await getOrCreateToken();
    const produkte = await wunschlisteProdukte(token);
    const ids      = await wunschlisteIds(token);
    return NextResponse.json({ produkte, ids });
  } catch (err) {
    console.error("[API GET /wunschliste]", err);
    return NextResponse.json({ produkte: [], ids: [] });
  }
}

/** POST – Produkt hinzufügen */
export async function POST(req: NextRequest) {
  try {
    const { produkt_id } = await req.json();
    if (!produkt_id) return NextResponse.json({ error: "produkt_id fehlt" }, { status: 400 });
    const token = await getOrCreateToken();
    await wunschlisteHinzufuegen(token, produkt_id);
    const ids = await wunschlisteIds(token);
    return NextResponse.json({ ok: true, ids });
  } catch (err) {
    console.error("[API POST /wunschliste]", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}

/** DELETE – Produkt entfernen */
export async function DELETE(req: NextRequest) {
  try {
    const { produkt_id } = await req.json();
    if (!produkt_id) return NextResponse.json({ error: "produkt_id fehlt" }, { status: 400 });
    const token = await getOrCreateToken();
    await wunschlisteEntfernen(token, produkt_id);
    const ids = await wunschlisteIds(token);
    return NextResponse.json({ ok: true, ids });
  } catch (err) {
    console.error("[API DELETE /wunschliste]", err);
    return NextResponse.json({ error: "Fehler" }, { status: 500 });
  }
}
