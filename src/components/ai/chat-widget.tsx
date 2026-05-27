"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ProduktMini } from "./produkt-mini";

const SCHNELL_FRAGEN = [
  "Что у вас в избранном?",
  "Покажи мебель 60-х годов",
  "Что есть до 100 000 ₸?",
  "Какие у вас категории?",
];

export function ChatWidget() {
  const [offen, setOffen] = useState(false);
  const [text,  setText]  = useState("");
  const { nachrichten, isLoading, fehler, senden, zuruecksetzen } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const pathname  = usePathname();

  // Auf der dedizierten Assistant-Page nicht rendern — sonst Doppel-UI.
  // (Page mountet eigenen useChat-State und Vollbild-Layout.)
  if (pathname.startsWith("/assistent")) return null;

  // Auto-scroll bei neuen Nachrichten
  useEffect(() => {
    if (offen && scrollRef.current) {
      scrollRef.current.scrollTo({
        top:      scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [nachrichten, offen, isLoading]);

  // Focus Input beim Öffnen
  useEffect(() => {
    if (offen) inputRef.current?.focus();
  }, [offen]);

  const handleSenden = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const msg = text;
    setText("");
    await senden(msg);
  };

  const handleSchnellFrage = async (frage: string) => {
    await senden(frage);
  };

  return (
    <>
      {/* ─── Floating Button ────────────────────────────────────────── */}
      <button
        onClick={() => setOffen(v => !v)}
        className={`
          fixed bottom-[110px] right-4 md:bottom-6 md:right-6 z-30
          w-12 h-12 md:w-14 md:h-14 flex items-center justify-center
          bg-vintage-espresso text-vintage-gold
          hover:bg-vintage-brown hover:scale-105
          transition-all duration-300
          shadow-xl
        `}
        style={{
          borderRadius: "50%",
          boxShadow:    "var(--shadow-vintage-lg)",
        }}
        aria-label={offen ? "Закрыть чат" : "Открыть чат"}
      >
        {offen ? (
          <X className="w-5 h-5" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6" />
            <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-vintage-gold animate-pulse" />
          </div>
        )}
      </button>

      {/* ─── Chat-Fenster ────────────────────────────────────────────── */}
      {/* Mobile: bottom-[180px] (über Chat-Button + TabBar), Desktop: bottom-24 */}
      {offen && (
        <div
          className="
            fixed bottom-[180px] right-4 md:bottom-24 md:right-6 z-50
            w-[calc(100vw-2rem)] sm:w-96 max-w-md
            h-[55vh] max-h-[600px]
            bg-vintage-white border border-vintage-sand
            flex flex-col overflow-hidden
            animate-in slide-in-from-bottom-4 fade-in
          "
          style={{
            borderRadius: "var(--radius-card)",
            boxShadow:    "var(--shadow-vintage-xl)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-vintage-espresso text-vintage-cream border-b border-vintage-brown">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-vintage-gold" />
              <div className="leading-tight">
                <p className="font-serif text-base">Винтаж-ассистент</p>
                <p className="text-vintage-cream/50 text-[10px] font-sans uppercase tracking-widest">
                  ИИ · DeepSeek
                </p>
              </div>
            </div>
            {nachrichten.length > 0 && (
              <button
                onClick={zuruecksetzen}
                className="p-1.5 text-vintage-cream/50 hover:text-vintage-cream transition-colors"
                aria-label="Очистить историю"
                title="Новый чат"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nachrichten */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-vintage-parchment/50"
          >
            {nachrichten.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="p-3 bg-vintage-gold/10 border border-vintage-gold/30 mb-3" style={{ borderRadius: "50%" }}>
                  <Sparkles className="w-6 h-6 text-vintage-gold" />
                </div>
                <p className="font-serif text-vintage-espresso text-lg mb-1">
                  Здравствуйте! 👋
                </p>
                <p className="text-vintage-dust text-xs font-sans mb-6 max-w-xs">
                  Я помогу вам найти идеальную винтажную вещь.
                  Спросите меня о категориях, эпохах или ценах.
                </p>

                <div className="w-full space-y-2">
                  <p className="text-vintage-dust text-[10px] font-sans uppercase tracking-widest mb-1">
                    Популярные вопросы
                  </p>
                  {SCHNELL_FRAGEN.map(frage => (
                    <button
                      key={frage}
                      onClick={() => handleSchnellFrage(frage)}
                      className="
                        w-full text-left px-3 py-2
                        text-xs font-sans text-vintage-brown
                        bg-vintage-white border border-vintage-sand
                        hover:bg-vintage-cream hover:border-vintage-brown
                        transition-colors
                      "
                      style={{ borderRadius: "var(--radius-vintage)" }}
                    >
                      {frage}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nachrichten.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.rolle === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`
                    max-w-[85%] px-3.5 py-2.5
                    ${msg.rolle === "user"
                      ? "bg-vintage-espresso text-vintage-cream"
                      : "bg-vintage-white border border-vintage-sand text-vintage-ink"
                    }
                  `}
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <p className="text-sm font-sans whitespace-pre-wrap leading-relaxed">
                    {msg.inhalt}
                  </p>
                </div>

                {/* Tool-Indikator */}
                {msg.rolle === "assistant" && msg.tools_genutzt && msg.tools_genutzt.length > 0 && (
                  <p className="text-[10px] text-vintage-dust font-sans mt-1 px-1">
                    ✦ {Array.from(new Set(msg.tools_genutzt)).join(" · ")}
                  </p>
                )}

                {/* Produkt-Karten */}
                {msg.rolle === "assistant" && msg.referenzen && msg.referenzen.length > 0 && (
                  <div className="mt-2 w-full max-w-[85%] space-y-1.5">
                    {msg.referenzen.slice(0, 6).map(p => (
                      <ProduktMini key={p.id} produkt={p} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-vintage-dust text-xs font-sans px-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Думаю …
              </div>
            )}

            {fehler && (
              <div
                className="px-3 py-2 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-xs font-sans"
                style={{ borderRadius: "var(--radius-vintage)" }}
              >
                {fehler}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSenden}
            className="flex gap-2 p-3 bg-vintage-white border-t border-vintage-sand"
          >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Напишите сообщение …"
              disabled={isLoading}
              className="
                flex-1 px-3 py-2
                bg-vintage-cream border border-vintage-sand
                text-sm font-sans text-vintage-ink
                focus:outline-none focus:border-vintage-brown
                disabled:opacity-50
                transition-colors
              "
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="
                p-2 bg-vintage-gold text-vintage-espresso
                hover:bg-vintage-copper
                disabled:opacity-30 disabled:cursor-not-allowed
                transition-colors
              "
              style={{ borderRadius: "var(--radius-vintage)" }}
              aria-label="Отправить"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
