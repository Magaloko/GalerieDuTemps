import OpenAI from "openai";

// ---------------------------------------------------------------------------
// DeepSeek API – OpenAI-kompatibler Endpunkt
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

export function getDeepseekClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[DeepSeek] DEEPSEEK_API_KEY nicht gesetzt. Bitte .env.local prüfen."
    );
  }

  _client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    timeout: 30_000,
  });

  return _client;
}

/** Standard-Modell für Chat (günstig + schnell) */
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

/** Reasoning-Modell für komplexe Anfragen */
export const DEEPSEEK_REASONER = "deepseek-reasoner";
