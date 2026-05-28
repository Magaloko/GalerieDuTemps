"use client";

import { useState } from "react";
import { Mail, Send, Check, AlertCircle, Loader2 } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * ClaimInitForm — startet den Magic-Link-Claim-Flow.
 *
 * Liest initData direkt aus window.Telegram.WebApp (gleicher Mechanismus
 * wie AuthGate) und sendet zusammen mit der E-Mail an /api/telegram/claim-init.
 *
 * Server-Antwort:
 *  - 200 + { emailMasked, expiresMin } → Success-State
 *  - 404 → „Аккаунт не найден"
 *  - 409 → „Уже привязан" / „chat-id занят"
 *  - 401 → initData ungültig (signal zum AuthGate-Refresh)
 *
 * UI bleibt minimal — eine Eingabe, ein Button, Success/Error-State.
 * ────────────────────────────────────────────────────────────────────────── */
export function ClaimInitForm() {
  const [email,  setEmail]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error,  setError]  = useState<string | null>(null);
  const [masked, setMasked] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      setError("Откройте Mini-App через бот, а не в обычном браузере.");
      setStatus("error");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Укажите корректный e-mail.");
      setStatus("error");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/telegram/claim-init", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          initData: tg.initData,
          email:    email.trim(),
        }),
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        setStatus("error");
        setError(data?.error ?? `Ошибка HTTP ${r.status}`);
        return;
      }

      setStatus("sent");
      setMasked(data.emailMasked ?? email);

      // Haptic-Feedback wenn verfügbar
      try {
        const haptic = (tg as unknown as {
          HapticFeedback?: { notificationOccurred: (s: string) => void };
        }).HapticFeedback;
        haptic?.notificationOccurred("success");
      } catch {/* ignore */}
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Сетевая ошибка");
    } finally {
      setBusy(false);
    }
  };

  if (status === "sent") {
    return (
      <div
        className="p-5 text-center space-y-3"
        style={{
          background: "rgba(127,140,90,0.10)",
          border:     "1px solid rgba(127,140,90,0.40)",
        }}
      >
        <div
          className="inline-flex items-center justify-center"
          style={{
            width:        48,
            height:       48,
            background:   "#52663F",
            color:        "#fff",
            borderRadius: "50%",
          }}
        >
          <Check className="w-5 h-5" />
        </div>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   16,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          Письмо отправлено
        </p>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--tg-theme-hint-color, var(--color-ink-soft))",
            lineHeight: 1.5,
          }}
        >
          Откройте письмо на <strong className="font-mono not-italic" style={{ color: "var(--color-ink)" }}>{masked}</strong>{" "}
          и нажмите «Подтвердить». Ссылка действительна 15 минут.
        </p>
        <p
          className="text-[11px]"
          style={{
            color: "var(--tg-theme-hint-color, var(--color-ink-mute))",
          }}
        >
          Не пришло? Проверьте «Спам». После подтверждения откройте
          Mini-App снова.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 p-4"
      style={{
        background: "var(--tg-theme-section-bg-color, #fff)",
        border:     "1px solid var(--color-line)",
      }}
    >
      <label className="block">
        <span
          className="block mb-1.5 text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}
        >
          E-mail аккаунта
        </span>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--color-ink-mute)" }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
            autoComplete="email"
            inputMode="email"
            placeholder="anna@example.kz"
            className="w-full pl-10 pr-3 py-3 text-sm focus:outline-none"
            style={{
              background:  "var(--color-bone)",
              border:      "1px solid var(--color-line)",
              color:       "var(--tg-theme-text-color, var(--color-ink))",
              minHeight:   44,
              touchAction: "manipulation",
            }}
          />
        </div>
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
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 text-[11px] uppercase font-medium transition-opacity disabled:opacity-50"
        style={{
          letterSpacing: "0.22em",
          background:    "var(--color-coral)",
          color:         "#fff",
          minHeight:     44,
          touchAction:   "manipulation",
        }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {busy ? "Отправляем…" : "Отправить ссылку"}
      </button>

      <p
        className="text-[10px] text-center"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--tg-theme-hint-color, var(--color-ink-mute))",
        }}
      >
        Подтверждение по почте — единственный безопасный способ привязки.
      </p>
    </form>
  );
}
