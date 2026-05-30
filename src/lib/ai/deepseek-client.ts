import OpenAI from "openai";
import { getKiApiKey } from "@/lib/db/ki-einstellungen";

// ---------------------------------------------------------------------------
// DeepSeek API – OpenAI-kompatibler Endpunkt
//
// Der API-Key kommt zur Laufzeit aus dem Admin-Menü (DB) mit ENV als Fallback
// (siehe lib/db/ki-einstellungen). Daher ist getDeepseekClient async. Der
// Client wird gecacht, aber bei Key-Wechsel (Admin-Änderung) neu erstellt.
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;
let _clientKey: string | null = null;

export async function getDeepseekClient(): Promise<OpenAI> {
  const apiKey = await getKiApiKey();
  if (!apiKey) {
    throw new Error(
      "[DeepSeek] API-ключ не задан. Внесите его в «Админ → Настройки → ИИ» (или ENV DEEPSEEK_API_KEY).",
    );
  }

  if (_client && _clientKey === apiKey) return _client;

  _client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    timeout: 30_000,
  });
  _clientKey = apiKey;
  return _client;
}

/** Standard-Modell für Chat (günstig + schnell) */
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

/** Reasoning-Modell für komplexe Anfragen */
export const DEEPSEEK_REASONER = "deepseek-reasoner";
