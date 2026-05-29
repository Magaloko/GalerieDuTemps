"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { provisionenStornierenAction } from "./actions";
import { useToast } from "@/components/ui/toast-provider";

export function StornoButton({
  kontaktanfrageId,
  produktName,
}: {
  kontaktanfrageId: string;
  produktName:      string | null;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const handle = () => {
    const grund = prompt(
      `Сторнировать комиссию для «${produktName ?? "этой продажи"}».\n` +
      `Причина (например, возврат, отказ в течение 14 дней):`
    );
    if (!grund || grund.trim().length < 5) return;

    if (!confirm("Действительно сторнировать? Затронутые партнёры получат уведомление по e-mail.")) return;

    startTransition(async () => {
      const result = await provisionenStornierenAction(kontaktanfrageId, grund);
      if (result.fehler) toast.error(result.fehler);
      else toast.success("Сторнировано");
    });
  };

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="flex items-center gap-1 px-2 py-1 text-xs font-sans text-vintage-burgundy border border-vintage-burgundy/30 hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
      style={{ borderRadius: "var(--radius-vintage)" }}
      title="Сторнировать"
    >
      <Ban className="w-3 h-3" /> Сторно
    </button>
  );
}
