import type { ProduktListItem } from "./produkt";

// ---------------------------------------------------------------------------
// Chat-Typen
// ---------------------------------------------------------------------------

export type ChatRolle = "user" | "assistant" | "system" | "tool";

/** Vereinfachte Nachricht für UI (ohne Tool-Calls Internals) */
export interface ChatNachricht {
  rolle:           ChatRolle;
  inhalt:          string;
  zeitstempel?:    number;
  /** Referenzen auf Produkte, die in dieser Antwort erwähnt werden */
  referenzen?:     ProduktListItem[];
  /** Welche Tools wurden in dieser Iteration aufgerufen */
  tools_genutzt?:  string[];
}

/** Antwortformat vom /api/ai/chat Endpunkt */
export interface ChatAntwort {
  nachricht:     ChatNachricht;
  /** Alle Nachrichten (inkl. neuer Assistant-Antwort) für nächsten Request */
  verlauf:       Array<{
    role:        "user" | "assistant" | "system" | "tool";
    content:     string | null;
    tool_calls?: unknown;
    tool_call_id?: string;
  }>;
}
