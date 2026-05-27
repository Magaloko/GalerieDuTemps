"use client";

import { useTransition } from "react";
import { CheckCircle2, XCircle, Mail, Clock, FileText } from "lucide-react";
import { b2bFreischaltenAction, b2bAblehnenAction } from "./actions";
import type { B2bAntrag } from "@/lib/db/customer-b2b";

const STATUS_STYLE: Record<string, { label: string; klasse: string }> = {
  b2b_pending:  { label: "Ожидает",     klasse: "text-vintage-gold     bg-vintage-gold/10"     },
  b2b_verified: { label: "Подтверждён", klasse: "text-vintage-sage     bg-vintage-sage/10"     },
  b2b_rejected: { label: "Отклонён",    klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
};

export function B2bAntragZeile({ antrag }: { antrag: B2bAntrag }) {
  const [pending, startTransition] = useTransition();
  const style = STATUS_STYLE[antrag.customer_type] ?? STATUS_STYLE.b2b_pending;

  const handleFreischalten = () => {
    const coupon = prompt("Необязательно: приветственный промокод (оставьте пустым, если не нужен)") ?? undefined;
    startTransition(async () => {
      const result = await b2bFreischaltenAction(antrag.id, coupon || undefined);
      if (result.fehler) alert(result.fehler);
    });
  };

  const handleAblehnen = () => {
    const grund = prompt("Причина отказа:");
    if (!grund || grund.length < 5) return;
    startTransition(async () => {
      const result = await b2bAblehnenAction(antrag.id, grund);
      if (result.fehler) alert(result.fehler);
    });
  };

  return (
    <div
      className={`bg-vintage-white border p-5 ${antrag.customer_type === "b2b_pending" ? "border-vintage-gold/50 bg-vintage-gold/5" : "border-vintage-sand"} ${pending ? "opacity-50" : ""}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-vintage-espresso text-lg">{antrag.company_name}</p>
            <span className={`px-2 py-0.5 text-xs font-sans ${style.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
              {style.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-vintage-dust font-sans">
            <span>{antrag.vorname} {antrag.nachname}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {antrag.email}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(antrag.erstellt_am).toLocaleDateString("ru-RU")}</span>
          </div>
          {antrag.ust_id && (
            <p className="text-sm font-mono text-vintage-brown mt-2">НДС-ID: {antrag.ust_id}</p>
          )}
          {antrag.company_note && (
            <details className="mt-2">
              <summary className="text-xs text-vintage-brown cursor-pointer flex items-center gap-1 font-sans">
                <FileText className="w-3 h-3" /> Показать обоснование / заметку
              </summary>
              <pre className="text-xs text-vintage-ink font-sans bg-vintage-parchment p-3 mt-2 whitespace-pre-wrap" style={{ borderRadius: "var(--radius-vintage)" }}>
                {antrag.company_note}
              </pre>
            </details>
          )}
        </div>

        {antrag.customer_type === "b2b_pending" && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={handleFreischalten}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vintage-sage text-white text-xs font-sans tracking-widest uppercase hover:bg-vintage-forest transition-colors disabled:opacity-50"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <CheckCircle2 className="w-3 h-3" /> Активировать
            </button>
            <button
              onClick={handleAblehnen}
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <XCircle className="w-3 h-3" /> Отклонить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
