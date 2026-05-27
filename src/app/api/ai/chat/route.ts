import { NextRequest, NextResponse } from "next/server";
import type OpenAI from "openai";
import { getDeepseekClient, DEEPSEEK_MODEL } from "@/lib/ai/deepseek-client";
import { vintageMarketTools, SYSTEM_PROMPT } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-handler";
import { rateLimitPruefen, getClientIp, tooManyRequestsResponse } from "@/lib/utils/rate-limit";
import type { ProduktListItem } from "@/types/produkt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;   // Edge timeout-Schutz

const MAX_ITERATIONS = 5;

// ---------------------------------------------------------------------------
// POST /api/ai/chat
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Rate-Limit: 20 Nachrichten / Minute / IP (verhindert API-Cost-Explosion)
  const ip = getClientIp(req);
  const rl = rateLimitPruefen(`ai-chat:${ip}`, 20, 60 * 1000);
  if (!rl.erlaubt) return tooManyRequestsResponse(rl);

  let body: { verlauf?: OpenAI.Chat.Completions.ChatCompletionMessageParam[]; nachricht?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 });
  }

  const userNachricht = body.nachricht?.trim();
  if (!userNachricht) {
    return NextResponse.json({ error: "Nachricht erforderlich" }, { status: 400 });
  }

  // Verlauf aufbauen (mit System-Prompt am Anfang)
  const verlauf: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    // Vorheriger Verlauf (ohne System-Prompts)
    ...(body.verlauf ?? []).filter(m => m.role !== "system"),
    { role: "user", content: userNachricht },
  ];

  // Alle Produkt-Referenzen aus Tool-Calls dieser Konversationsrunde
  const alleReferenzen: ProduktListItem[] = [];
  const genutzteTools: string[]            = [];

  let client: OpenAI;
  try {
    client = getDeepseekClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "DeepSeek nicht konfiguriert";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  // ─── Agentic Loop ────────────────────────────────────────────────────────
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        model:       DEEPSEEK_MODEL,
        messages:    verlauf,
        tools:       vintageMarketTools,
        tool_choice: "auto",
        max_tokens:  800,
        temperature: 0.7,
      });
    } catch (err) {
      console.error("[Chat] DeepSeek-Fehler:", err);
      return NextResponse.json(
        { error: "KI-Service nicht erreichbar. Bitte später erneut versuchen." },
        { status: 502 }
      );
    }

    const choice = response.choices[0];
    if (!choice?.message) break;

    verlauf.push(choice.message);

    // ─── Wenn Tools aufgerufen → ausführen und weiter ───────────────────
    if (
      choice.finish_reason === "tool_calls" &&
      choice.message.tool_calls?.length
    ) {
      const toolResults = await Promise.all(
        choice.message.tool_calls.map(async (call) => {
          if (call.type === "function") {
            genutzteTools.push(call.function.name);
          }
          const ergebnis = await executeTool(call);
          alleReferenzen.push(...ergebnis.referenzen);
          return {
            role:         "tool" as const,
            tool_call_id: call.id,
            content:      ergebnis.inhalt,
          };
        })
      );
      verlauf.push(...toolResults);
      continue;   // nächste Iteration
    }

    // ─── Fertig: finale Antwort ─────────────────────────────────────────
    const inhalt = choice.message.content?.trim() ??
                   "Entschuldigung, ich konnte keine Antwort generieren.";

    // Duplikate aus Referenzen entfernen
    const uniqRef = Array.from(
      new Map(alleReferenzen.map(r => [r.id, r])).values()
    );

    return NextResponse.json({
      nachricht: {
        rolle:         "assistant",
        inhalt,
        referenzen:    uniqRef,
        tools_genutzt: genutzteTools,
        zeitstempel:   Date.now(),
      },
      verlauf: verlauf.filter(m => m.role !== "system"),
    });
  }

  // Max Iterations erreicht
  return NextResponse.json({
    nachricht: {
      rolle:       "assistant",
      inhalt:      "Entschuldigung, das war komplexer als erwartet. Bitte versuche es etwas spezifischer.",
      referenzen:  alleReferenzen,
      zeitstempel: Date.now(),
    },
    verlauf: verlauf.filter(m => m.role !== "system"),
  });
}
