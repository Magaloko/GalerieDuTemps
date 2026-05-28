"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";
import { haptic } from "../fx";

/* ──────────────────────────────────────────────────────────────────────────
 * AccountCreateForm — 1-Tap-Konto für Telegram-first-Nutzer.
 *
 * Liest initData aus window.Telegram.WebApp und POSTet an
 * /api/telegram/account-create. Bei Erfolg ist der Session-Cookie gesetzt →
 * router.refresh() zeigt sofort das echte Profil.
 *
 * Keine E-Mail nötig — die kann der Nutzer später im Profil ergänzen.
 * ────────────────────────────────────────────────────────────────────────── */
export function AccountCreateForm() {
  const router = useRouter();
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anlegen = async () => {
    setError(null);
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) {
      setError("Откройте Mini-App через бот, а не в обычном браузере.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/telegram/account-create", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ initData: tg.initData }),
        credentials: "include",
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        haptic("success");
        router.refresh();
      } else {
        setError(d.error ?? "Не удалось создать профиль.");
        setBusy(false);
      }
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={anlegen}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-[12px] uppercase font-medium disabled:opacity-60"
        style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", touchAction: "manipulation" }}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        Создать профиль за 1 тап
      </button>
      <p className="text-[11px] text-center px-2"
        style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
        Без e-mail и пароля — всё привязано к вашему Telegram. E-mail можно добавить позже.
      </p>
      {error && (
        <p className="flex items-center justify-center gap-1.5 text-[12px]"
          style={{ color: "var(--color-coral-deep, #A53E26)" }}>
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
