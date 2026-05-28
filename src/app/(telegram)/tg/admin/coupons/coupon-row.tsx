"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket } from "lucide-react";
import { couponToggleAction } from "../actions";
import { haptic } from "../../fx";

export function CouponRow(p: {
  id: string; code: string; wertLabel: string; beschreibung: string | null; aktiv: boolean;
}) {
  const router = useRouter();
  const [aktiv, setAktiv] = useState(p.aktiv);
  const [pending, start]  = useTransition();

  const toggle = () => {
    const next = !aktiv;
    setAktiv(next);
    start(async () => {
      const r = await couponToggleAction(p.id, next);
      if (r.ok) { haptic("light"); router.refresh(); }
      else { setAktiv(!next); haptic("error"); }
    });
  };

  return (
    <div className="flex items-center gap-3 p-3" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <Ticket className="w-4 h-4 shrink-0" style={{ color: aktiv ? "var(--color-coral)" : "var(--color-ink-mute)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          {p.code} <span style={{ color: "var(--color-coral)" }}>{p.wertLabel}</span>
        </p>
        {p.beschreibung && <p className="text-[11px] truncate" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{p.beschreibung}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={aktiv}
        disabled={pending}
        onClick={toggle}
        className="relative shrink-0"
        style={{ width: 40, height: 22, background: aktiv ? "var(--color-coral)" : "var(--color-line)", borderRadius: 999 }}
      >
        {pending
          ? <Loader2 className="w-3 h-3 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: "#fff" }} />
          : <span className="absolute top-0.5 transition-transform" style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", transform: aktiv ? "translateX(20px)" : "translateX(2px)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />}
      </button>
    </div>
  );
}
