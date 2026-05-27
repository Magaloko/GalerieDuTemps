import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/config";
import { getDeepseekClient, DEEPSEEK_MODEL } from "@/lib/ai/deepseek-client";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ExtractResult {
  name:                 string;
  kurzbeschreibung:     string;
  beschreibung:         string;
  era:                  string | null;
  herkunft:             string | null;
  material:             string | null;
  zustand:              "sehr_gut" | "gut" | "akzeptabel" | "restauriert";
  tags:                 string[];
  seo_titel:            string;
  seo_beschreibung:     string;
  instagram_caption:    string;
  instagram_hashtags:   string[];
}

const SYSTEM_PROMPT = `Du bist ein erfahrener Experte für Vintage-Möbel, Antiquitäten und Sammlerstücke bei "Galerie du Temps" in Kasachstan.

Aufgabe: Aus den Notizen des Verkäufers extrahierst du strukturierte Produktdaten in einem JSON-Objekt. Sprache der Ausgabe ist standardmäßig RUSSISCH (kasachischer Markt).

Antwort STRICT als JSON, ohne Markdown-Codefences, ohne Kommentare. Schema:
{
  "name":              string (Produktname, prägnant, 3-80 Zeichen),
  "kurzbeschreibung":  string (ein Satz, max 200 Zeichen, mit Charakter),
  "beschreibung":      string (Markdown: ## Описание, dann 2-4 Absätze mit Geschichte, Details, Besonderheiten, ## Состояние, ## Размеры — wenn bekannt),
  "era":               string|null (z.B. "1920-е", "Ар-деко", "Бидермейер", "Викторианская эпоха"),
  "herkunft":          string|null (Land/Region, RU: "Германия", "Франция" etc.),
  "material":          string|null ("Дуб, латунь" o.ä.),
  "zustand":           "sehr_gut"|"gut"|"akzeptabel"|"restauriert" (entscheide aus Beschreibung),
  "tags":              array of 3-7 RU-Schlagwörter ohne #, kurz, lowercase,
  "seo_titel":         string (≤70 Zeichen, RU, magnetisch),
  "seo_beschreibung":  string (≤160 Zeichen, RU, mit Call-to-Action),
  "instagram_caption": string (Caption für IG-Post: poetisch, 4-8 Zeilen, Emojis sparsam, Storytelling, am Ende „📍 Алматы · Galerie du Temps"),
  "instagram_hashtags": array of 10-15 relevant tags (mit #, gemischt RU/EN: #винтаж #vintage #antique #галериядютемп etc.)
}

Wenn ein Feld nicht aus den Notizen ableitbar ist, schätze fundiert. Niemals halluzinieren bei materiellen Fakten (Maße, Preise). Tonalität: elegant, kuratiert, kein Hard-Sell.`;

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
    notizen = String(body.notizen ?? "").slice(0, 4000).trim();
    preisHint = body.preis_hint ? String(body.preis_hint).slice(0, 50) : undefined;
    kategorieHint = body.kategorie ? String(body.kategorie).slice(0, 50) : undefined;
    if (notizen.length < 20) {
      return NextResponse.json({ error: "Notizen zu kurz (min 20 Zeichen)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  const userPrompt = `Notizen vom Verkäufer:
"""
${notizen}
"""

${preisHint    ? `Preis-Hinweis: ${preisHint} KZT\n` : ""}${kategorieHint ? `Kategorie-Hinweis: ${kategorieHint}\n` : ""}
Bitte extrahiere jetzt das JSON gemäß Schema.`;

  try {
    const client = getDeepseekClient();
    const res = await client.chat.completions.create({
      model:           DEEPSEEK_MODEL,
      response_format: { type: "json_object" },
      temperature:     0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw = res.choices[0]?.message?.content ?? "";
    let parsed: ExtractResult;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[ai-extract] DeepSeek lieferte kein gültiges JSON:", raw.slice(0,200));
      return NextResponse.json({ error: "KI-Antwort nicht parsbar" }, { status: 502 });
    }

    // Light validation
    if (!parsed.name || !parsed.beschreibung) {
      return NextResponse.json({ error: "KI-Antwort unvollständig" }, { status: 502 });
    }
    if (!["sehr_gut","gut","akzeptabel","restauriert"].includes(parsed.zustand)) {
      parsed.zustand = "gut";
    }
    parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
    parsed.instagram_hashtags = Array.isArray(parsed.instagram_hashtags)
      ? parsed.instagram_hashtags.slice(0, 15)
      : [];

    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI-Fehler";
    console.error("[ai-extract]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
