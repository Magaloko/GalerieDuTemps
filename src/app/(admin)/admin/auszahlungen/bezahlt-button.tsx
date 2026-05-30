"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, FileText } from "lucide-react";
import { alsBezahltMarkierenAction } from "./actions";
import { useModuleBase } from "@/lib/module-base-client";

export function BezahltButton({ auszahlungId }: { auszahlungId: string }) {
  const mbase = useModuleBase();
  const [pending, startTransition] = useTransition();

  const handle = () => {
    if (!confirm("Отметить эту выплату как оплаченную? Партнёр получит уведомление по e-mail.")) return;
    startTransition(async () => {
      const result = await alsBezahltMarkierenAction(auszahlungId);
      if (result.fehler) alert(result.fehler);
    });
  };

  return (
    <div className="flex gap-1.5">
      <Link
        href={`${mbase}/auszahlungen/${auszahlungId}/beleg`}
        target="_blank"
        className="flex items-center gap-1 px-2 py-1 border border-vintage-sand text-vintage-brown text-xs font-sans hover:bg-vintage-parchment transition-colors"
        style={{ borderRadius: "var(--radius-vintage)" }}
        title="Показать акт начисления"
      >
        <FileText className="w-3 h-3" />
      </Link>
      <button
        onClick={handle}
        disabled={pending}
        className="flex items-center gap-1 px-2 py-1 bg-vintage-sage text-white text-xs font-sans hover:bg-vintage-forest transition-colors disabled:opacity-50"
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <CheckCircle2 className="w-3 h-3" /> {pending ? "..." : "Оплачено"}
      </button>
    </div>
  );
}
