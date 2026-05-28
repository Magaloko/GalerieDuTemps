"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, Briefcase } from "lucide-react";
import { b2bFreischaltenAction, b2bAblehnenAction } from "../actions";
import { haptic } from "../../fx";

interface Props {
  id:      string;
  name:    string;
  email:   string;
  company: string | null;
  ustId:   string | null;
  note:    string | null;
}

export function B2bRow(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone]  = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [grund, setGrund] = useState("");

  const approve = () => start(async () => {
    const r = await b2bFreischaltenAction(p.id);
    if (r.ok) { haptic("success"); setDone("✓ Подтверждён"); setTimeout(() => router.refresh(), 800); }
    else { haptic("error"); setDone(r.error); }
  });
  const reject = () => start(async () => {
    const r = await b2bAblehnenAction(p.id, grund);
    if (r.ok) { haptic("warning"); setDone("Отклонён"); setTimeout(() => router.refresh(), 800); }
    else { haptic("error"); setDone(r.error); }
  });

  return (
    <div className="p-3" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", borderLeft: "3px solid #C9A84C" }}>
      <div className="flex items-start gap-2.5">
        <Briefcase className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
            {p.company || p.name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            {p.name} · {p.email}
          </p>
          {p.ustId && <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>БИН/ИИН: {p.ustId}</p>}
          {p.note && <p className="text-[11px] mt-1" style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>{p.note}</p>}
        </div>
      </div>

      {done ? (
        <p className="mt-2 text-[12px]" style={{ color: done.startsWith("✓") || done === "Отклонён" ? "#52663F" : "var(--color-coral-deep,#A53E26)" }}>{done}</p>
      ) : rejecting ? (
        <div className="mt-2 space-y-2">
          <input value={grund} onChange={e => setGrund(e.target.value)} placeholder="Причина (необязательно)"
                 className="w-full px-2 py-1.5 text-sm" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }} />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={reject} className="flex-1 py-2 text-[11px] uppercase font-medium" style={{ background: "var(--color-coral)", color: "#fff" }}>
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Отклонить"}
            </button>
            <button type="button" onClick={() => setRejecting(false)} className="px-3 py-2 text-[11px] uppercase" style={{ background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-2.5">
          <button type="button" disabled={pending} onClick={approve} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium" style={{ letterSpacing: "0.16em", background: "#52663F", color: "#fff" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Подтвердить
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="px-3 py-2 text-[11px] uppercase font-medium" style={{ background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
