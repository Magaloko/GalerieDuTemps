"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Send, Check, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { claimBestaetigenAction } from "./actions";

interface Props {
  token:     string;
  email:     string;
  vorname:   string | null;
  chatId:    number;
  username:  string | null;
  expiresAt: string;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ClaimForm — bestätigt oder lehnt die Telegram-Claim ab.
 *
 * Server-Component (page.tsx) hat schon Token-Validierung gemacht — wenn
 * wir hier rendern, ist der Claim noch gültig.
 *
 * Nach „Подтвердить":
 *  - Action ruft claimBestaetigen → atomares UPDATE
 *  - UI zeigt Success-State mit Hint zum Wiederöffnen der Mini-App
 *  - Kein Auto-Redirect — User soll bewusst Mini-App neu starten
 * ────────────────────────────────────────────────────────────────────────── */
export function ClaimForm({ token, email, vorname, chatId, username, expiresAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [status,  setStatus]       = useState<"idle" | "success" | "error">("idle");
  const [error,   setError]        = useState<string | null>(null);

  const expiresIn = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000));

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const r = await claimBestaetigenAction(token);
      if (r.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  };

  if (status === "success") {
    return (
      <div className="text-center space-y-5">
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
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   20,
            color:      "var(--color-ink)",
          }}
        >
          Аккаунт привязан
        </p>
        <p
          className="text-sm max-w-sm mx-auto"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
            lineHeight: 1.6,
          }}
        >
          Откройте Mini-App в Telegram снова — теперь вы увидите свои заказы,
          избранное и получите уведомления о статусе.
        </p>
        <Link
          href="/kunde"
          className="btn-coral btn-coral-sm inline-flex items-center gap-2 mt-2"
        >
          В личный кабинет <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div
        className="p-4 space-y-3"
        style={{
          background: "var(--color-bone)",
          border:     "1px solid var(--color-line)",
        }}
      >
        <Row label="Аккаунт" value={vorname || email} />
        <Row label="E-mail"  value={email} />
        <Row
          label="Telegram"
          value={username ? `@${username}` : `chat #${chatId}`}
        />
        <Row label="Действует" value={`ещё ${expiresIn} мин`} />
      </div>

      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
          lineHeight: 1.6,
        }}
      >
        После подтверждения этот Telegram-аккаунт будет привязан к вашему
        кабинету. Вы будете получать уведомления о заказах и сможете
        отслеживать историю прямо в Mini-App.
      </p>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 text-sm"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep, #A53E26)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="btn-coral btn-coral-lg w-full"
        style={{ minHeight: 52, touchAction: "manipulation" }}
      >
        {pending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Привязываем…</>
        ) : (
          <><Send className="w-4 h-4" /> Подтвердить привязку</>
        )}
      </button>

      <Link
        href="/"
        className="block text-center text-[11px] uppercase font-medium hover:opacity-80 transition-opacity"
        style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
      >
        Отмена · вернуться на сайт
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="text-[10px] uppercase font-medium shrink-0"
        style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-mono text-right truncate"
        style={{ color: "var(--color-ink)" }}
      >
        {value}
      </span>
    </div>
  );
}
