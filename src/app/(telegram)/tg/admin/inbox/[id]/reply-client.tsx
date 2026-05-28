"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Check, AlertCircle, Loader2 } from "lucide-react";
import { haptic } from "../../../fx";

interface Props {
  leadId:      string;
  channel:     "telegram" | "email";
  kontaktName: string;
}

/* Vorlagen zum schnellen Antippen — ersetzen den Entwurf (mit Bestätigung,
 * falls schon Text getippt wurde). */
const TEMPLATES: { label: string; text: string }[] = [
  { label: "Доступен",  text: "Здравствуйте! Да, этот предмет ещё доступен. " },
  { label: "Бронь 48ч", text: "Могу отложить его для вас на 48 часов. Подтвердите, пожалуйста. " },
  { label: "Продан",    text: "К сожалению, этот предмет уже продан. Но у нас есть похожие — подскажу с радостью. " },
  { label: "Спасибо",   text: "Спасибо за интерес к Galerie du Temps! " },
];

/* ──────────────────────────────────────────────────────────────────────────
 * LeadReplyClient — Inline-Reply-Form im Mini-App-Admin.
 *
 * Sendet via /api/telegram/admin/reply. Kanal (telegram/email) wird vom
 * Server bestimmt + hier nur als Label angezeigt. Nach Erfolg: Success-
 * Banner + router.refresh damit die neue outbound-Message in der
 * Conversation erscheint.
 * ────────────────────────────────────────────────────────────────────────── */
export function LeadReplyClient({ leadId, channel, kontaktName }: Props) {
  const router = useRouter();
  const [text,   setText]   = useState("");
  const [busy,   setBusy]   = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) { setError("Откройте через Telegram."); return; }
    if (text.trim().length < 1) return;

    setBusy(true);
    try {
      const r = await fetch("/api/telegram/admin/reply", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ initData: tg.initData, lead_id: leadId, text: text.trim() }),
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setError(data?.error ?? `HTTP ${r.status}`); return; }
      setDone(true);
      setText("");
      haptic("success");
      // Conversation neu laden (neue outbound-Message anzeigen)
      setTimeout(() => router.refresh(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div
        className="flex items-center gap-2 p-3 text-sm"
        style={{
          background: "rgba(127,140,90,0.10)",
          border:     "1px solid rgba(127,140,90,0.40)",
          color:      "#52663F",
        }}
      >
        <Check className="w-4 h-4 shrink-0" />
        Ответ отправлен ({channel === "telegram" ? "Telegram" : "e-mail"}).
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
        >
          Ответить · {kontaktName}
        </label>
        <span
          className="text-[9px] uppercase font-medium px-1.5 py-0.5"
          style={{
            letterSpacing: "0.18em",
            background: channel === "telegram" ? "rgba(38,163,238,0.12)" : "var(--color-bone)",
            color:      channel === "telegram" ? "#1B7FB8" : "var(--color-ink-mute)",
          }}
        >
          {channel === "telegram" ? "→ Telegram" : "→ E-mail"}
        </span>
      </div>

      {/* Schnell-Vorlagen */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            type="button"
            disabled={busy}
            onClick={() => {
              if (text.trim().length > 0 && !window.confirm("Заменить текущий текст шаблоном?")) return;
              setText(t.text);
              haptic("light");
            }}
            className="px-2.5 py-1 text-[11px] disabled:opacity-40"
            style={{
              background:   "var(--color-bone)",
              border:       "1px solid var(--color-line)",
              color:        "var(--color-ink-soft)",
              borderRadius: 999,
              touchAction:  "manipulation",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 4000))}
        disabled={busy}
        rows={4}
        placeholder="Напишите ответ…"
        className="w-full p-3 text-sm focus:outline-none resize-y"
        style={{
          background:  "var(--color-bone)",
          border:      "1px solid var(--color-line)",
          color:       "var(--tg-theme-text-color, var(--color-ink))",
          minHeight:   90,
          touchAction: "manipulation",
        }}
      />

      {error && (
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
        disabled={busy || text.trim().length < 1}
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
        {busy ? "Отправка…" : "Отправить ответ"}
      </button>
    </form>
  );
}
