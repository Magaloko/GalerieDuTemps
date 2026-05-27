"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, RotateCcw, Compass, Coins, Heart, Layers } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ProduktMini } from "@/components/ai/produkt-mini";

/* ──────────────────────────────────────────────────────────────────────────
 * AssistentClient — Vollbild-KI-Beratung (Ассистент-Tab in der TabBar).
 *
 * Design-Linie:
 *  - Cobalt-Header (sticky)
 *  - Paper-BG für Chat-Liste, Welcome-Hero zentriert wenn leer
 *  - 4 Quick-Prompt-Gruppen (Эпохи, Цена, Категории, Wunschliste)
 *  - Sticky Input mit Coral-Send-Button — Bottom-Inset für MobileTabBar
 *  - Tool-Calls landen als ProduktMini-Cards unter der Assistant-Message
 *
 * Reuse: useChat() + /api/ai/chat (gleicher Endpoint wie Floating-Widget),
 * ProduktMini-Component für referenzierte Produkte.
 * ────────────────────────────────────────────────────────────────────────── */

interface QuickPrompt {
  text:  string;
  icon:  React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  group: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { group: "Эпохи",      icon: Compass, text: "Покажи мебель 60-х годов" },
  { group: "Эпохи",      icon: Compass, text: "Что у вас из ар-деко?" },
  { group: "Цена",       icon: Coins,   text: "Что есть до 100 000 ₸?" },
  { group: "Цена",       icon: Coins,   text: "Топ-3 находки до 50 000 ₸" },
  { group: "Категории",  icon: Layers,  text: "Какие у вас категории?" },
  { group: "Категории",  icon: Layers,  text: "Покажи керамику" },
  { group: "Wunschliste",icon: Heart,   text: "Что у меня в избранном?" },
  { group: "Wunschliste",icon: Heart,   text: "Похожее на моё избранное" },
];

export function AssistentClient() {
  const { nachrichten, isLoading, fehler, senden, zuruecksetzen } = useChat();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll an's Ende bei neuen Nachrichten / Loading-Flicker
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top:      scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [nachrichten, isLoading]);

  // Fokus aufs Input wenn Page mountet (Mobile: nicht aufpoppen, daher
  // nur Desktop-Browsern. matchMedia statt useEffect-Width für stabilen
  // SSR-Hydration-Match.)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer:fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  const handleSenden = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    const msg = text;
    setText("");
    await senden(msg);
  };

  const handlePrompt = async (p: string) => {
    if (isLoading) return;
    await senden(p);
  };

  const grouped = QUICK_PROMPTS.reduce<Record<string, QuickPrompt[]>>((acc, p) => {
    (acc[p.group] = acc[p.group] || []).push(p);
    return acc;
  }, {});

  return (
    <div
      className="flex flex-col"
      style={{
        // Höhe = Viewport minus Header (~64px) und TabBar (~80px). Auf Desktop
        // gibt's keine TabBar, daher dvh + flex-1 (Footer kommt nach).
        minHeight: "calc(100dvh - 64px)",
        background: "var(--color-paper)",
      }}
    >
      {/* ─── Cobalt-Header ────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 px-5 md:px-14 py-5"
        style={{
          background: "var(--color-cobalt)",
          color:      "var(--color-vintage-white)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-none w-10 h-10 flex items-center justify-center"
              style={{ background: "rgba(232,112,58,0.18)", borderRadius: "50%" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
            </div>
            <div className="min-w-0">
              <p
                className="truncate"
                style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.1 }}
              >
                Винтаж-ассистент
              </p>
              <p
                className="text-[10px] uppercase font-medium mt-0.5"
                style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.55)" }}
              >
                ИИ · Beta · {nachrichten.length} сообщ.
              </p>
            </div>
          </div>
          {nachrichten.length > 0 && (
            <button
              type="button"
              onClick={zuruecksetzen}
              className="flex-none p-2 hover:opacity-80 transition-opacity"
              aria-label="Очистить историю — новый чат"
              title="Новый чат"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Chat-Liste / Welcome ─────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 md:px-14 py-8 space-y-5">
          {nachrichten.length === 0 ? (
            /* Welcome-Hero + Quick-Prompts */
            <div className="space-y-10">
              <div className="text-center max-w-xl mx-auto">
                <p
                  className="text-[11px] uppercase font-medium mb-3"
                  style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
                >
                  Здравствуйте 👋
                </p>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   "clamp(2rem, 5vw, 3rem)",
                    lineHeight: 1.05,
                    color:      "var(--color-ink)",
                  }}
                >
                  Спросите про <em style={{ color: "var(--color-coral)", fontStyle: "italic" }}>винтаж</em>
                </h1>
                <p
                  className="mt-4 text-[15px] leading-relaxed"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  Помогу подобрать вещь по эпохе, цене или стилю. Найду похожее
                  на ваше избранное и подскажу про материалы и провенанс.
                </p>
              </div>

              {/* Quick-Prompt-Gruppen */}
              <div className="space-y-6">
                {Object.entries(grouped).map(([group, prompts]) => (
                  <div key={group}>
                    <p
                      className="text-[10px] uppercase font-medium mb-3"
                      style={{ letterSpacing: "0.28em", color: "var(--color-ink-mute)" }}
                    >
                      {group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prompts.map((p) => (
                        <button
                          key={p.text}
                          type="button"
                          onClick={() => handlePrompt(p.text)}
                          disabled={isLoading}
                          className="text-left px-4 py-3 transition-all hover:opacity-90 disabled:opacity-50 group"
                          style={{
                            background: "var(--color-bone)",
                            border:     "1px solid var(--color-line)",
                            color:      "var(--color-ink)",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <p.icon
                              className="w-4 h-4 flex-none"
                              style={{ color: "var(--color-coral)" }}
                            />
                            <span className="text-sm">{p.text}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            nachrichten.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.rolle === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className="max-w-[88%] md:max-w-[75%] px-4 py-3"
                  style={
                    msg.rolle === "user"
                      ? {
                          background: "var(--color-cobalt)",
                          color:      "var(--color-vintage-white)",
                          borderRadius: "16px 16px 4px 16px",
                        }
                      : {
                          background: "#fff",
                          border:     "1px solid var(--color-line)",
                          color:      "var(--color-ink)",
                          borderRadius: "16px 16px 16px 4px",
                          boxShadow:  "var(--shadow-soft)",
                        }
                  }
                >
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                    {msg.inhalt}
                  </p>
                </div>

                {msg.rolle === "assistant" && msg.tools_genutzt && msg.tools_genutzt.length > 0 && (
                  <p
                    className="mt-1 text-[10px] uppercase font-medium px-1"
                    style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
                  >
                    ✦ {Array.from(new Set(msg.tools_genutzt)).join(" · ")}
                  </p>
                )}

                {msg.rolle === "assistant" && msg.referenzen && msg.referenzen.length > 0 && (
                  <div className="mt-3 w-full max-w-[88%] md:max-w-[75%] space-y-2">
                    {msg.referenzen.slice(0, 6).map((p) => (
                      <ProduktMini key={p.id} produkt={p} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div
              className="flex items-center gap-2 px-2 text-[13px]"
              style={{ color: "var(--color-ink-mute)" }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Думаю …
            </div>
          )}

          {fehler && (
            <div
              className="px-4 py-3 text-[13px]"
              style={{
                background: "rgba(194,71,71,0.08)",
                border:     "1px solid rgba(194,71,71,0.3)",
                color:      "#8a2e2e",
              }}
            >
              {fehler}
            </div>
          )}
        </div>
      </div>

      {/* ─── Sticky Input ─────────────────────────────────────────────── */}
      <form
        onSubmit={handleSenden}
        className="sticky bottom-0 z-10 px-5 md:px-14"
        style={{
          background:    "var(--color-paper)",
          borderTop:     "1px solid var(--color-line)",
          // Auf Mobile sitzt darunter die TabBar (~80px) — wir reservieren
          // den Platz mit padding-bottom + safe-area, damit das Input nicht
          // verdeckt wird. Auf md+ schiebt sich nichts drunter.
          paddingTop:    12,
          paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
        }}
      >
        <div className="max-w-3xl mx-auto flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Напишите вопрос …"
            disabled={isLoading}
            className="flex-1 px-4 py-3 text-[15px] focus:outline-none disabled:opacity-50"
            style={{
              background: "#fff",
              border:     "1px solid var(--color-line)",
              color:      "var(--color-ink)",
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            aria-label="Отправить"
            className="flex-none w-12 h-12 flex items-center justify-center transition-opacity disabled:opacity-30 hover:opacity-90"
            style={{
              background: "var(--color-coral)",
              color:      "#fff",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
