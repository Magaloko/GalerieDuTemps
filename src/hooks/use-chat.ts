"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatNachricht } from "@/types/ai";

interface UseChatReturn {
  nachrichten:  ChatNachricht[];
  isLoading:    boolean;
  fehler:       string | null;
  senden:       (text: string) => Promise<void>;
  zuruecksetzen: () => void;
}

export function useChat(): UseChatReturn {
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [fehler,      setFehler]      = useState<string | null>(null);
  // Server-Verlauf (mit Tool-Calls) für nächste Requests
  const verlaufRef = useRef<Array<Record<string, unknown>>>([]);

  const senden = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatNachricht = {
      rolle:        "user",
      inhalt:       text,
      zeitstempel:  Date.now(),
    };
    setNachrichten(prev => [...prev, userMsg]);
    setIsLoading(true);
    setFehler(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          nachricht: text,
          verlauf:   verlaufRef.current,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Fehler beim Senden");
      }

      const data = await res.json();
      verlaufRef.current = data.verlauf ?? [];
      setNachrichten(prev => [...prev, data.nachricht]);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const zuruecksetzen = useCallback(() => {
    setNachrichten([]);
    verlaufRef.current = [];
    setFehler(null);
  }, []);

  return { nachrichten, isLoading, fehler, senden, zuruecksetzen };
}
