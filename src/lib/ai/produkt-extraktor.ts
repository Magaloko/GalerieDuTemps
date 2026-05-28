import { getDeepseekClient, DEEPSEEK_MODEL } from "./deepseek-client";

/* ──────────────────────────────────────────────────────────────────────────
 * Produkt-Extraktor (DeepSeek) — Notizen → strukturierte Produktdaten.
 *
 * Geteilte Logik für /api/ai/produkt-extraktor (Schnell-Formular) UND die
 * Server-Action „KI ausfüllen" der Entwürfe-Review-Queue.
 *
 * Hinweis: arbeitet auf TEXT (Notizen/Caption), nicht auf dem Bild.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ProduktExtraktResult {
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

export const PRODUKT_EXTRAKTOR_SYSTEM_PROMPT = `Du bist ein erfahrener Experte für Vintage-Möbel, Antiquitäten und Sammlerstücke bei "Galerie du Temps" in Kasachstan.

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

export class ExtraktorError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

/** Ruft DeepSeek und liefert validierte Produktdaten. Wirft ExtraktorError. */
export async function extrahiereProduktDaten(
  notizen: string,
  hints?: { preisHint?: string; kategorieHint?: string },
): Promise<ProduktExtraktResult> {
  const text = (notizen ?? "").slice(0, 4000).trim();
  if (text.length < 20) throw new ExtraktorError("Notizen zu kurz (min 20 Zeichen)", 400);

  const userPrompt = `Notizen vom Verkäufer:
"""
${text}
"""

${hints?.preisHint ? `Preis-Hinweis: ${hints.preisHint} KZT\n` : ""}${hints?.kategorieHint ? `Kategorie-Hinweis: ${hints.kategorieHint}\n` : ""}
Bitte extrahiere jetzt das JSON gemäß Schema.`;

  const client = getDeepseekClient();
  const res = await client.chat.completions.create({
    model:           DEEPSEEK_MODEL,
    response_format: { type: "json_object" },
    temperature:     0.7,
    messages: [
      { role: "system", content: PRODUKT_EXTRAKTOR_SYSTEM_PROMPT },
      { role: "user",   content: userPrompt },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "";
  let parsed: ProduktExtraktResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("[produkt-extraktor] kein gültiges JSON:", raw.slice(0, 200));
    throw new ExtraktorError("KI-Antwort nicht parsbar", 502);
  }
  if (!parsed.name || !parsed.beschreibung) throw new ExtraktorError("KI-Antwort unvollständig", 502);
  if (!["sehr_gut", "gut", "akzeptabel", "restauriert"].includes(parsed.zustand)) parsed.zustand = "gut";
  parsed.tags               = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
  parsed.instagram_hashtags = Array.isArray(parsed.instagram_hashtags) ? parsed.instagram_hashtags.slice(0, 15) : [];
  return parsed;
}
