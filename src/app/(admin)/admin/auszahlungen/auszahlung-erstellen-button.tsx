"use client";

import { useTransition } from "react";
import { Wallet } from "lucide-react";
import { auszahlungErstellenAction } from "./actions";
import { formatPreis } from "@/lib/utils/preis";

export function AuszahlungErstellenButton({
  affiliateId,
  methode,
  summeCent,
  affiliateName,
}: {
  affiliateId:   string;
  methode:       "sepa" | "paypal";
  summeCent:     number;
  affiliateName: string;
}) {
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm(
      `Создать выплату для ${affiliateName} на сумму ${formatPreis(summeCent / 100)} через ${methode.toUpperCase()}?\n\n` +
      `Все подтверждённые комиссии будут переведены в статус «Выплачено».`
    )) return;

    startTransition(async () => {
      const result = await auszahlungErstellenAction(affiliateId, methode);
      if (result.fehler) alert(result.fehler);
    });
  };

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-gold text-vintage-espresso text-xs font-sans tracking-widest uppercase hover:bg-vintage-copper transition-colors disabled:opacity-50"
      style={{ borderRadius: "var(--radius-button)" }}
    >
      <Wallet className="w-3 h-3" /> {pending ? "..." : "Создать"}
    </button>
  );
}
