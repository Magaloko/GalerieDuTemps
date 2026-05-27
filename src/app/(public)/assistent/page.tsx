import type { Metadata } from "next";
import { AssistentClient } from "./assistent-client";

/* ──────────────────────────────────────────────────────────────────────────
 * /assistent — Ассистент (KI-Beratung-Zentrale)
 *
 * Vollbild-Chat statt nur Floating-Bubble. Zentraler Hub für:
 *  - Vintage-Beratung (Era / Stil / Provenienz)
 *  - Produkt-Suche per Natural Language (Preis-Range, Kategorie, Tags)
 *  - Wunschlisten-Empfehlungen
 *  - Lieferzeit/Versand-Fragen
 *
 * Tools-Backend ist bereits gebaut (src/lib/ai/tools.ts + tool-handler.ts +
 * deepseek-client.ts). Diese Page nutzt useChat() das auf /api/ai/chat
 * postet — gleiche Endpoint die das Floating-Widget verwendet.
 *
 * Auf dieser Route blendet ChatWidget sich selbst aus (siehe chat-widget.tsx)
 * damit kein Doppel-UI entsteht.
 * ────────────────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title:       "Ассистент",
  description: "ИИ-консультант по винтажу — задайте вопрос, найдите идеальную вещь, узнайте об эпохах и материалах.",
  alternates:  { canonical: "/assistent" },
};

// Per-Visit dynamisch — keine Cache-Beziehungen, der Chat-State liegt im
// Client und der API-Endpoint POSTet pro Nachricht.
export const dynamic = "force-dynamic";

export default function AssistentPage() {
  return <AssistentClient />;
}
