"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ChevronDown, Check } from "lucide-react";
import { statusInlineAction } from "./actions";
import { useToast } from "@/components/ui/toast-provider";
import type { OrderStatus } from "@/types/commerce";

/* Status-Optionen + Chip-Ton (gleiche Zuordnung wie die Liste). */
const OPTIONS: { value: OrderStatus; label: string; chip: string }[] = [
  { value: "pending",   label: "Ожидает",   chip: "chip chip-warn"    },
  { value: "paid",      label: "Оплачен",   chip: "chip chip-success" },
  { value: "fulfilled", label: "Отправлен", chip: "chip chip-success" },
  { value: "completed", label: "Завершён",  chip: "chip chip-success" },
  { value: "cancelled", label: "Отменён",   chip: "chip chip-muted"   },
  { value: "refunded",  label: "Возврат",   chip: "chip chip-danger"  },
];

/**
 * StatusChipSelect — Inline-Edit des Bestellstatus direkt in der Listen-Zeile.
 * Klick auf den Chip öffnet ein Popover mit allen Stati; Auswahl mutiert
 * optimistisch via statusInlineAction (Revert + Toast bei Fehler).
 * Twenty-Pattern: schnelle Feld-Änderung ohne Detail-Seite.
 */
export function StatusChipSelect({
  orderId, initial,
}: { orderId: string; initial: OrderStatus }) {
  const [status, setStatus] = useState<OrderStatus>(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Klick außerhalb / Esc schließt das Popover.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find(o => o.value === status) ?? OPTIONS[0];

  const choose = (next: OrderStatus) => {
    setOpen(false);
    if (next === status) return;
    const prev = status;
    setStatus(next);                       // optimistic
    start(async () => {
      const r = await statusInlineAction(orderId, next);
      if (!r.ok) {
        setStatus(prev);                   // revert
        toast.error(r.error);
      } else {
        toast.success(r.message ?? "Готово");
      }
    });
  };

  return (
    <div ref={wrapRef} className="chip-select" style={{ opacity: pending ? 0.6 : 1 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={pending}
        className={`${current.chip} chip-select-trigger`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Изменить статус"
      >
        {current.label}
        <ChevronDown className="w-3 h-3 chip-select-caret" />
      </button>

      {open && (
        <div className="chip-select-menu" role="listbox">
          {OPTIONS.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === status}
              onClick={() => choose(o.value)}
              className="chip-select-option"
            >
              <span className={o.chip}>{o.label}</span>
              {o.value === status && <Check className="w-3.5 h-3.5 chip-select-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
