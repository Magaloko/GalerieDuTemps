"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Check, AlertCircle } from "lucide-react";
import { haptic } from "../fx";
import { useTelegramPost } from "../use-telegram-post";

/* ──────────────────────────────────────────────────────────────────────────
 * EmailAddForm — Telegram-first-Kunde ergänzt seine E-Mail.
 *
 *  frei      → /api/telegram/email-add setzt sie sofort → router.refresh().
 *  vergeben  → status "claim-required" → wir starten den Claim-Flow
 *              (/api/telegram/claim-init), der per Magic-Link bestätigt und
 *              die Konten zusammenführt.
 * ────────────────────────────────────────────────────────────────────────── */
export function EmailAddForm() {
  const router = useRouter();
  const { busy, post } = useTelegramPost();
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState<"idle" | "added" | "claim" | "error">("idle");
  const [msg, setMsg]       = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email.includes("@")) { setState("error"); setMsg("Укажите корректный e-mail."); return; }

    const r = await post<{ status?: string; error?: string }>("/api/telegram/email-add", { email: email.trim() });

    if (r.ok && r.data.status === "added") {
      haptic("success");
      setState("added");
      router.refresh();
      return;
    }

    if (r.ok && r.data.status === "claim-required") {
      // E-Mail gehört bestehendem Account → Claim-Magic-Link anstoßen.
      const c = await post<{ error?: string }>("/api/telegram/claim-init", { email: email.trim() });
      if (c.ok) {
        haptic("success");
        setState("claim");
        setMsg("Эта почта уже зарегистрирована. Мы отправили ссылку — подтвердите, и аккаунты объединятся.");
      } else {
        haptic("error");
        setState("error");
        setMsg(c.error ?? c.data.error ?? "Не удалось отправить ссылку.");
      }
      return;
    }

    haptic("error");
    setState("error");
    setMsg(r.error ?? r.data.error ?? "Ошибка. Попробуйте позже.");
  };

  if (state === "added") {
    return (
      <p className="flex items-center gap-1.5 text-[12px] px-1" style={{ color: "#52663F" }}>
        <Check className="w-3.5 h-3.5" /> E-mail добавлен.
      </p>
    );
  }
  if (state === "claim") {
    return (
      <p className="flex items-start gap-1.5 text-[12px] px-1" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
        <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} /> {msg}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex items-center gap-2">
        <Mail className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
        <p className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          Добавить e-mail
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 px-2.5 py-2 text-sm"
          style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
        />
        <button
          type="submit"
          disabled={busy}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] uppercase font-medium disabled:opacity-50"
          style={{ letterSpacing: "0.16em", background: "var(--color-coral)", color: "#fff", touchAction: "manipulation" }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-[11px] px-1" style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
        Для чеков и входа на сайте. Аккаунт остаётся привязан к Telegram.
      </p>
      {state === "error" && msg && (
        <p className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-coral-deep, #A53E26)" }}>
          <AlertCircle className="w-3.5 h-3.5" /> {msg}
        </p>
      )}
    </form>
  );
}
