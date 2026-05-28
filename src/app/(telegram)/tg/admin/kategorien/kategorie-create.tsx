"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check } from "lucide-react";
import { kategorieErstellenAction } from "../actions";
import { haptic } from "../../fx";

export function KategorieCreate({ parents }: { parents: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [name, setName]   = useState("");
  const [eltern, setEltern] = useState("");
  const [pending, start]  = useTransition();
  const [flash, setFlash] = useState<{ t: "ok" | "err"; m: string } | null>(null);

  const create = () => start(async () => {
    const r = await kategorieErstellenAction(name, eltern ? parseInt(eltern, 10) : null);
    if (r.ok) {
      haptic("success");
      setFlash({ t: "ok", m: "Создано" });
      setName(""); setEltern("");
      setTimeout(() => { setFlash(null); setOpen(false); router.refresh(); }, 900);
    } else {
      haptic("error");
      setFlash({ t: "err", m: r.error });
    }
  });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase font-medium"
        style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff" }}>
        <Plus className="w-3.5 h-3.5" /> Новая категория
      </button>
    );
  }

  return (
    <div className="p-3 space-y-2" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Название категории"
        className="w-full px-2.5 py-2 text-sm" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }} />
      <select value={eltern} onChange={e => setEltern(e.target.value)}
        className="w-full px-2.5 py-2 text-sm" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
        <option value="">— верхний уровень —</option>
        {parents.map(p => <option key={p.id} value={p.id}>↳ в «{p.name}»</option>)}
      </select>
      {flash && <p className="text-[11px]" style={{ color: flash.t === "ok" ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
        {flash.t === "ok" ? <Check className="w-3 h-3 inline mr-1" /> : null}{flash.m}
      </p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || name.trim().length < 2} onClick={create}
          className="flex-1 py-2 text-[11px] uppercase font-medium disabled:opacity-40" style={{ background: "var(--color-ink)", color: "#fff" }}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Создать"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-2 text-[11px] uppercase" style={{ background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}>
          Отмена
        </button>
      </div>
    </div>
  );
}
