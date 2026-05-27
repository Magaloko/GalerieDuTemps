"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import type { Locale } from "@/i18n/types";

interface MethodItem {
  method:   string;
  icon:     string;
  endpoint: string;
  title:    string;
  sub:      string;
}

interface Props {
  orderId:    string;
  totalCents: number;
  waehrung:   string;
  methods:    MethodItem[];
  locale:     Locale;
}

/* ──────────────────────────────────────────────────────────────────────────
 * MethodPicker
 *
 * Liste von Karten — User wählt eine, klickt Submit. Submit POSTet zur
 * methode-spezifischen Endpoint, der entweder:
 *  a) eine Redirect-URL liefert (Stripe Checkout, PayPal, Crypto)
 *  b) eine interne Confirm-Page liefert (Bank, Vor-Ort)
 * ────────────────────────────────────────────────────────────────────────── */
export function MethodPicker({ orderId, totalCents, waehrung, methods, locale }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = () => {
    if (!selected) return;
    const m = methods.find(x => x.method === selected);
    if (!m) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await fetch(m.endpoint, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ order_id: orderId }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        const j = await r.json();
        // Provider gibt entweder externe URL (Stripe Hosted, PayPal Approval)
        // ODER internen Pfad (Bank-Details, Vor-Ort-Bestätigung).
        const target = j.checkout_url || j.redirect_to;
        if (!target) throw new Error("Provider hat keine Redirect-URL zurückgegeben");
        if (target.startsWith("http")) {
          window.location.assign(target);
        } else {
          router.push(target);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  void locale;  // Reserved für zukünftige Sprach-Anpassungen pro Methode

  return (
    <div className="space-y-3">
      {/* Total-Summary oben */}
      <div
        className="flex items-center justify-between p-4 mb-4"
        style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)" }}
      >
        <span
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
        >
          К оплате
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          {formatPreis(totalCents / 100, waehrung as "KZT"|"EUR"|"USD"|"RUB")}
        </span>
      </div>

      {/* Method-Liste */}
      {methods.map(m => {
        const isActive = selected === m.method;
        return (
          <label
            key={m.method}
            className="block cursor-pointer transition-shadow hover:shadow-soft"
            style={{
              background:   "#fff",
              border:       `1px solid ${isActive ? "var(--color-coral)" : "var(--color-line)"}`,
              borderLeftWidth: isActive ? 4 : 1,
              padding:      "16px 18px",
              touchAction:  "manipulation",
            }}
          >
            <input
              type="radio"
              name="payment_method"
              value={m.method}
              checked={isActive}
              onChange={() => setSelected(m.method)}
              className="sr-only"
            />
            <div className="flex items-start gap-4">
              <span
                className="text-2xl shrink-0"
                style={{ width: 32, textAlign: "center" }}
                aria-hidden
              >
                {m.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize:   17,
                    color:      "var(--color-ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {m.title}
                </p>
                <p
                  className="mt-1 text-[13px]"
                  style={{
                    fontFamily: "var(--font-italic)",
                    fontStyle:  "italic",
                    color:      "var(--color-ink-soft)",
                  }}
                >
                  {m.sub}
                </p>
              </div>
              <span
                aria-hidden
                style={{
                  width: 18, height: 18,
                  border: `2px solid ${isActive ? "var(--color-coral)" : "var(--color-line)"}`,
                  borderRadius: "50%",
                  marginTop: 4,
                  position: "relative",
                }}
              >
                {isActive && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 3, left: 3,
                      width: 8, height: 8,
                      background: "var(--color-coral)",
                      borderRadius: "50%",
                    }}
                  />
                )}
              </span>
            </div>
          </label>
        );
      })}

      {methods.length === 0 && (
        <div
          className="p-4 text-sm"
          style={{
            background: "var(--color-bone)",
            border:     "1px solid var(--color-line)",
            color:      "var(--color-ink-soft)",
          }}
        >
          Нет доступных способов оплаты. Проверьте настройки провайдеров в
          админ-панели.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 text-sm flex items-start gap-2"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!selected || pending}
        className="btn-coral btn-coral-lg w-full mt-4"
        style={{ minHeight: 52, touchAction: "manipulation" }}
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? "Подключение…" : "Продолжить"}
        {!pending && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
