"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { CheckCircle2, EyeOff, Star, XCircle, Trash2, Loader2, AlertCircle } from "lucide-react";
import { produktBulkAction } from "@/app/(admin)/admin/produkte/actions";

/**
 * Bulk-Toolbar mit Selection-Management via DOM-Event-Bus.
 *
 * Funktioniert ohne globalen Store: die Listen-Page rendert pro Zeile eine
 * <input type="checkbox" data-bulk-id="…"> Checkbox. Diese Komponente liest
 * sie über document.querySelectorAll() und behandelt Select-All über das
 * `data-bulk-select-all` Element. Ereignisse:
 *
 *  - "bulk:toggle"  CustomEvent({ id, checked }) — wenn Row-Checkbox klickt
 *  - "bulk:reset"  CustomEvent — z.B. nach Filter-Wechsel
 */
export function BulkToolbar() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const allCheckboxRef = useRef<HTMLInputElement | null>(null);

  // Sync mit DOM-Checkboxen
  useEffect(() => {
    const onToggle = (e: Event) => {
      const ce = e as CustomEvent<{ id: string; checked: boolean }>;
      setSelected(prev => {
        const next = new Set(prev);
        if (ce.detail.checked) next.add(ce.detail.id);
        else next.delete(ce.detail.id);
        return next;
      });
    };
    const onReset = () => setSelected(new Set());
    document.addEventListener("bulk:toggle", onToggle);
    document.addEventListener("bulk:reset", onReset);
    return () => {
      document.removeEventListener("bulk:toggle", onToggle);
      document.removeEventListener("bulk:reset", onReset);
    };
  }, []);

  const toggleAll = (checked: boolean) => {
    const boxes = document.querySelectorAll<HTMLInputElement>("[data-bulk-id]");
    const next = new Set<string>();
    boxes.forEach(b => {
      b.checked = checked;
      if (checked) next.add(b.dataset.bulkId!);
    });
    setSelected(next);
  };

  const apply = (action: Parameters<typeof produktBulkAction>[1]) => {
    if (selected.size === 0) return;
    if (action === "loeschen" && !confirm(`Удалить ${selected.size} товар(ов)? Действие необратимо.`)) return;
    start(async () => {
      const r = await produktBulkAction([...selected], action);
      if (r.ok) {
        setFeedback({ ok: true, msg: `Обновлено: ${r.count}` });
        setSelected(new Set());
        // DOM-Checkboxen zurücksetzen
        document.querySelectorAll<HTMLInputElement>("[data-bulk-id]").forEach(b => (b.checked = false));
        if (allCheckboxRef.current) allCheckboxRef.current.checked = false;
      } else {
        setFeedback({ ok: false, msg: r.error ?? "Ошибка" });
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  if (selected.size === 0 && !feedback) return null;

  return (
    <div className="sticky top-16 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-vintage-espresso text-vintage-cream border-y border-vintage-gold/40 flex flex-wrap items-center gap-3 shadow-md">
      <span className="text-sm font-sans">
        <strong className="text-vintage-gold">{selected.size}</strong> выбрано
      </span>

      <div className="flex flex-wrap gap-2 ml-auto">
        <BulkBtn icon={CheckCircle2} label="Включить"        onClick={() => apply("aktivieren")}    disabled={pending} />
        <BulkBtn icon={EyeOff}       label="Отключить"       onClick={() => apply("deaktivieren")}  disabled={pending} />
        <BulkBtn icon={Star}         label="В избранное"     onClick={() => apply("featured_an")}   disabled={pending} />
        <BulkBtn icon={Star}         label="Снять избр."     onClick={() => apply("featured_aus")}  disabled={pending} />
        <BulkBtn icon={XCircle}      label="Отметить продано" onClick={() => apply("verkauft")}     disabled={pending} />
        <BulkBtn icon={Trash2}       label="Удалить"         onClick={() => apply("loeschen")}      disabled={pending} variant="danger" />

        {pending && <Loader2 className="w-4 h-4 animate-spin text-vintage-gold" />}

        <button
          type="button"
          onClick={() => { toggleAll(false); setSelected(new Set()); }}
          className="px-3 py-1.5 text-xs font-sans border border-vintage-cream/30 hover:bg-white/10 transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Снять выбор
        </button>
      </div>

      {feedback && (
        <div className={`w-full text-xs font-sans flex items-center gap-2 ${feedback.ok ? "text-vintage-sage" : "text-vintage-burgundy"}`}>
          {feedback.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {feedback.msg}
        </div>
      )}

      {/* Hidden Select-All-Ref damit toggleAll() funktioniert */}
      <input type="checkbox" ref={allCheckboxRef} className="hidden" />
    </div>
  );
}

function BulkBtn({
  icon: Icon, label, onClick, disabled, variant = "default",
}: { icon: React.ElementType; label: string; onClick: () => void; disabled: boolean; variant?: "default" | "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans tracking-widest uppercase border transition-colors disabled:opacity-50 ${
        variant === "danger"
          ? "border-vintage-burgundy/40 text-vintage-burgundy hover:bg-vintage-burgundy hover:text-vintage-cream"
          : "border-vintage-cream/30 text-vintage-cream hover:bg-vintage-gold hover:text-vintage-espresso hover:border-vintage-gold"
      }`}
      style={{ borderRadius: "var(--radius-button)" }}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

/**
 * Row-Checkbox als eigene Komponente, damit Liste sie pro Zeile rendern kann.
 */
export function BulkCheckbox({ id }: { id: string }) {
  return (
    <input
      type="checkbox"
      data-bulk-id={id}
      onChange={(e) => {
        document.dispatchEvent(
          new CustomEvent("bulk:toggle", { detail: { id, checked: e.target.checked } })
        );
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 accent-vintage-gold cursor-pointer"
    />
  );
}

/**
 * Header-Select-All-Checkbox.
 */
export function BulkSelectAll() {
  return (
    <input
      type="checkbox"
      data-bulk-select-all
      onChange={(e) => {
        const checked = e.target.checked;
        document.querySelectorAll<HTMLInputElement>("[data-bulk-id]").forEach(b => {
          b.checked = checked;
          document.dispatchEvent(
            new CustomEvent("bulk:toggle", { detail: { id: b.dataset.bulkId, checked } })
          );
        });
      }}
      className="w-4 h-4 accent-vintage-gold cursor-pointer"
      title="Все"
    />
  );
}
