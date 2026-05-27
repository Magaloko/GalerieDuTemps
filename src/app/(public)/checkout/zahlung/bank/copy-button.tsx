"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="mt-3 w-full inline-flex items-center justify-center gap-2 text-[11px] uppercase font-medium py-2"
      style={{
        letterSpacing: "0.22em",
        color:         "var(--color-coral)",
        background:    "transparent",
        border:        "1px solid var(--color-coral)",
        touchAction:   "manipulation",
        minHeight:     40,
      }}
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? "Скопировано" : label}
    </button>
  );
}
