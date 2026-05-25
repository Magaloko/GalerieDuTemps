"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { provisionenStornierenAction } from "./actions";

export function StornoButton({
  kontaktanfrageId,
  produktName,
}: {
  kontaktanfrageId: string;
  produktName:      string | null;
}) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    const grund = prompt(
      `Provision für "${produktName ?? "diesen Verkauf"}" stornieren.\n` +
      `Grund (z.B. Retoure, Rücktritt innerhalb 14-Tage-Frist):`
    );
    if (!grund || grund.trim().length < 5) return;

    if (!confirm("Wirklich stornieren? Betroffene Partner werden per E-Mail benachrichtigt.")) return;

    startTransition(async () => {
      const result = await provisionenStornierenAction(kontaktanfrageId, grund);
      if (result.fehler) alert(result.fehler);
    });
  };

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="flex items-center gap-1 px-2 py-1 text-xs font-sans text-vintage-burgundy border border-vintage-burgundy/30 hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
      style={{ borderRadius: "var(--radius-vintage)" }}
      title="Stornieren"
    >
      <Ban className="w-3 h-3" /> Storno
    </button>
  );
}
