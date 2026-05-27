"use client";

import { useActionState, useEffect } from "react";
import { X, Coins, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { alsVerkauftMarkierenAction } from "./actions";

interface Props {
  kontaktanfrageId: string;
  kontaktName:      string;
  onClose:          () => void;
}

export function VerkauftDialog({ kontaktanfrageId, kontaktName, onClose }: Props) {
  const action = alsVerkauftMarkierenAction.bind(null, kontaktanfrageId);
  const [state, formAction, isPending] = useActionState(action, null);

  // Auto-Schließen nach Erfolg
  useEffect(() => {
    if (state?.ok) {
      const t = setTimeout(onClose, 4000);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  // ESC-Taste
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-vintage-ink/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative bg-vintage-white border border-vintage-sand max-w-md w-full p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-xl)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div>
          <div className="inline-flex p-2 bg-vintage-gold/10 border border-vintage-gold/30 mb-3" style={{ borderRadius: "var(--radius-card)" }}>
            <Coins className="w-5 h-5 text-vintage-gold" />
          </div>
          <h2 className="font-serif text-xl text-vintage-espresso">Отметить как проданную</h2>
          <p className="text-vintage-dust text-xs font-sans mt-1">
            Заявка от <strong className="text-vintage-brown">{kontaktName}</strong>
          </p>
        </div>

        {/* Erfolgs-Anzeige */}
        {state?.ok ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-vintage-sage/10 border border-vintage-sage/30" style={{ borderRadius: "var(--radius-card)" }}>
              <CheckCircle2 className="w-5 h-5 text-vintage-sage flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-vintage-forest">Продажа отмечена!</p>
                <p className="text-xs text-vintage-forest font-sans mt-1">
                  {state.provisionen_erstellt && state.provisionen_erstellt > 0
                    ? <>
                        Создано комиссий: <strong>{state.provisionen_erstellt}</strong>, сумма{" "}
                        <strong>{state.provisionen_summe_eur?.toFixed(2).replace(".", ",")} €</strong>. Затронутые партнёры уведомлены.
                      </>
                    : "Для этой заявки нет партнёрской атрибуции — комиссии не созданы."
                  }
                </p>
              </div>
            </div>
            {(state.provisionen_erstellt ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-vintage-dust font-sans">
                <Sparkles className="w-3 h-3 text-vintage-gold" />
                Закроется автоматически …
              </div>
            )}
          </div>
        ) : (
          /* Formular */
          <form action={formAction} className="space-y-4">
            <Input
              label="Цена продажи (EUR)"
              name="preis_eur"
              type="number"
              step="0.01"
              min="0.01"
              required
              autoFocus
              placeholder="0.00"
              hint="Основа для расчёта комиссий"
            />

            {state?.fehler && (
              <div className="flex items-center gap-2 p-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-vintage-burgundy text-xs font-sans" style={{ borderRadius: "var(--radius-vintage)" }}>
                <AlertCircle className="w-4 h-4" /> {state.fehler}
              </div>
            )}

            <div className="text-xs text-vintage-dust font-sans bg-vintage-parchment p-3" style={{ borderRadius: "var(--radius-vintage)" }}>
              <p><strong>Примечание:</strong> Если заявка пришла по партнёрской ссылке,
              комиссии будут автоматически рассчитаны до 3 уровней, а партнёры
              получат уведомление по e-mail.</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-sans uppercase tracking-widest text-vintage-dust hover:bg-vintage-parchment transition-colors disabled:opacity-50"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Отмена
              </button>
              <Button type="submit" loading={isPending} icon={<Coins className="w-3.5 h-3.5" />}>
                Подтвердить продажу
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
