"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { dncAction } from "./actions";

export function DncButton({ customerId, istDnc }: { customerId: string; istDnc: boolean }) {
  const [pending, startTransition] = useTransition();

  if (istDnc) return null;

  const handle = () => {
    const grund = prompt("Grund für DNC (Do Not Contact)?\nDer Kund:in erhält dann keine Marketing-E-Mails mehr.");
    if (!grund) return;
    startTransition(() => dncAction(customerId, grund));
  };

  return (
    <button onClick={handle} disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
      style={{ borderRadius: "var(--radius-button)" }}>
      <Ban className="w-3 h-3" /> DNC
    </button>
  );
}
