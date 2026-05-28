"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle, Send, Check, AlertCircle, Loader2, ChevronLeft, Package,
} from "lucide-react";

interface Props {
  produktId:   string | null;
  produktName: string | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * KontaktClient — Direkt-Nachricht aus Mini-App.
 *
 * Form: 1 Textarea (Min 5 / Max 2000 Zeichen) + Submit.
 * Wenn produkt-Context → Banner oben mit Produkt-Name + Hint.
 * Nach Success → Confirmation-State mit Hinweis dass Kurator antwortet.
 *
 * initData für Auth ist client-side via window.Telegram.WebApp.initData
 * — keine Cookies, kein vorheriger Login nötig.
 *
 * Charakter-Counter zeigt verbleibende Zeichen, wird coral bei <100.
 * ────────────────────────────────────────────────────────────────────────── */
export function KontaktClient({ produktId, produktName }: Props) {
  const [text,   setText]   = useState("");
  const [busy,   setBusy]   = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error,  setError]  = useState<string | null>(null);

  const MAX = 2000;
  const remaining = MAX - text.length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      setError("Откройте Mini-App через бот.");
      setStatus("error");
      return;
    }
    if (text.trim().length < 5) {
      setError("Сообщение слишком короткое.");
      setStatus("error");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/telegram/kontakt", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          initData:   tg.initData,
          text:       text.trim(),
          produkt_id: produktId ?? undefined,
          betreff:    produktName ? `Вопрос: ${produktName}` : undefined,
        }),
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus("error");
        setError(data?.error ?? `HTTP ${r.status}`);
        return;
      }
      setStatus("sent");
      // Haptic
      try {
        const haptic = (tg as unknown as {
          HapticFeedback?: { notificationOccurred: (s: string) => void };
        }).HapticFeedback;
        haptic?.notificationOccurred("success");
      } catch {}
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (status === "sent") {
    return (
      <main className="p-4 min-h-[70vh] flex flex-col items-center justify-center text-center gap-4">
        <div
          className="inline-flex items-center justify-center"
          style={{
            width:        64,
            height:       64,
            background:   "rgba(127,140,90,0.12)",
            border:       "1px solid rgba(127,140,90,0.40)",
            borderRadius: "50%",
          }}
        >
          <Check className="w-8 h-8" style={{ color: "#52663F" }} />
        </div>
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✓ Отправлено
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   24,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
            lineHeight: 1.15,
          }}
        >
          Куратор скоро ответит
        </h1>
        <p
          className="text-sm max-w-xs"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
            lineHeight: 1.6,
          }}
        >
          Сообщение получено. Ответ придёт сюда в Telegram или на e-mail,
          если ваш аккаунт привязан.
        </p>
        <div className="flex gap-2 mt-4">
          <Link
            href="/tg"
            className="px-4 py-2 text-[11px] uppercase font-medium"
            style={{
              letterSpacing: "0.22em",
              background:    "var(--color-coral)",
              color:         "#fff",
              touchAction:   "manipulation",
            }}
          >
            К каталогу
          </Link>
          {produktId && (
            <Link
              href={`/tg/produkt/${produktId}`}
              className="px-4 py-2 text-[11px] uppercase font-medium"
              style={{
                letterSpacing: "0.22em",
                background:    "var(--tg-theme-section-bg-color, #fff)",
                border:        "1px solid var(--color-line)",
                color:         "var(--tg-theme-text-color, var(--color-ink))",
                touchAction:   "manipulation",
              }}
            >
              К товару
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="p-4">
      {/* Back */}
      <Link
        href={produktId ? `/tg/produkt/${produktId}` : "/tg"}
        className="inline-flex items-center gap-1 mb-4 text-[11px] uppercase font-medium"
        style={{
          letterSpacing: "0.18em",
          color:         "var(--tg-theme-link-color, var(--color-coral))",
        }}
      >
        <ChevronLeft className="w-3 h-3" /> Назад
      </Link>

      {/* Header */}
      <header className="mb-5">
        <p
          className="text-[10px] uppercase font-medium mb-1"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Сообщение
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   24,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
            lineHeight: 1.15,
          }}
        >
          {produktName ? "Спросить о товаре" : "Связаться с куратором"}
        </h1>
        <p
          className="mt-1 text-xs"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
          }}
        >
          Опишите вопрос — кратко или подробно. Ответ обычно в течение дня.
        </p>
      </header>

      {/* Produkt-Context-Banner */}
      {produktName && (
        <div
          className="flex items-start gap-2.5 p-3 mb-4"
          style={{
            background: "var(--color-bone)",
            border:     "1px solid var(--color-line)",
            borderLeft: "3px solid var(--color-coral)",
          }}
        >
          <Package className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}
            >
              О товаре
            </p>
            <p
              className="text-sm truncate"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              {produktName}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span
            className="block mb-1.5 text-[10px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}
          >
            Сообщение
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            disabled={busy}
            required
            rows={6}
            placeholder={
              produktName
                ? "Например: доступен ли торг? есть ли дополнительные фото? размеры?"
                : "Расскажите, что вас интересует…"
            }
            className="w-full p-3 text-sm focus:outline-none resize-y"
            style={{
              background:  "var(--color-bone)",
              border:      "1px solid var(--color-line)",
              color:       "var(--tg-theme-text-color, var(--color-ink))",
              minHeight:   120,
              touchAction: "manipulation",
            }}
          />
          <p
            className="text-[10px] text-right mt-1"
            style={{
              color: remaining < 100
                ? "var(--color-coral)"
                : "var(--tg-theme-hint-color, var(--color-ink-mute))",
            }}
          >
            {remaining} / {MAX}
          </p>
        </label>

        {error && status === "error" && (
          <div
            role="alert"
            className="flex items-start gap-2 p-2.5 text-xs"
            style={{
              background: "rgba(232,112,58,0.08)",
              border:     "1px solid rgba(232,112,58,0.35)",
              color:      "var(--color-coral-deep, #A53E26)",
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || text.trim().length < 5}
          className="w-full flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium transition-opacity disabled:opacity-40"
          style={{
            letterSpacing: "0.22em",
            background:    "var(--color-coral)",
            color:         "#fff",
            minHeight:     48,
            touchAction:   "manipulation",
          }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {busy ? "Отправляем…" : "Отправить"}
        </button>

        <p
          className="text-[10px] text-center"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
          }}
        >
          <MessageCircle className="w-3 h-3 inline mr-1" style={{ verticalAlign: -1 }} />
          Сообщения видны только команде Galerie du Temps.
        </p>
      </form>
    </main>
  );
}
