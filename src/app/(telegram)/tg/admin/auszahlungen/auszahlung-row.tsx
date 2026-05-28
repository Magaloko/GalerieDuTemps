"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, Check } from "lucide-react";
import { auszahlungBezahltAction } from "../actions";
import { haptic } from "../../fx";

export function AuszahlungRow(p: { id: string; name: string; email: string; betrag: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone]  = useState(false);
  const [confirm, setConfirm] = useState(false);

  const pay = () => start(async () => {
    const r = await auszahlungBezahltAction(p.id);
    if (r.ok) { haptic("success"); setDone(true); setTimeout(() => router.refresh(), 800); }
    else { haptic("error"); }
  });

  return (
    <div className="flex items-center gap-3 p-3" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <Wallet className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>{p.name}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{p.email}</p>
      </div>
      <span className="text-sm font-mono shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>{p.betrag}</span>
      {done ? (
        <Check className="w-4 h-4 shrink-0" style={{ color: "#52663F" }} />
      ) : confirm ? (
        <button type="button" disabled={pending} onClick={pay} className="px-2.5 py-1.5 text-[10px] uppercase font-medium shrink-0" style={{ background: "#52663F", color: "#fff" }}>
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Точно?"}
        </button>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="px-2.5 py-1.5 text-[10px] uppercase font-medium shrink-0" style={{ background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}>
          Выплачено
        </button>
      )}
    </div>
  );
}
