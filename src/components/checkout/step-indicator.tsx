import { Check } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * StepIndicator — Drei-Punkt-Pfad für den Checkout-Flow.
 *
 *   ● Корзина ── ○ Оплата ── ○ Подтверждение
 *
 * Verwendet auf:
 *   - /warenkorb           → currentStep="cart"
 *   - /checkout/zahlung    → currentStep="payment"
 *   - /checkout/erfolg/... → currentStep="done"
 *
 * Server-Component — keine Interaktivität. Hilft dem User zu verstehen wo
 * im Flow er ist, das verringert Abandonment-Rate signifikant (klassisches
 * UX-Pattern aus E-Commerce-Best-Practices).
 * ────────────────────────────────────────────────────────────────────────── */

export type CheckoutStep = "cart" | "payment" | "done";

const STEPS: { key: CheckoutStep; label: string; nummer: number }[] = [
  { key: "cart",    label: "Корзина",      nummer: 1 },
  { key: "payment", label: "Оплата",       nummer: 2 },
  { key: "done",    label: "Подтверждение", nummer: 3 },
];

export function StepIndicator({ current }: { current: CheckoutStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === current);

  return (
    <nav
      aria-label="Шаги оформления заказа"
      className="flex items-center justify-center gap-2 sm:gap-4 mb-10"
    >
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive    = i === currentIndex;
        const isUpcoming  = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            {/* Bullet */}
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex items-center justify-center text-[11px] font-medium transition-colors"
                style={{
                  width:        24,
                  height:       24,
                  borderRadius: "50%",
                  background:   isCompleted
                    ? "var(--color-coral)"
                    : isActive
                      ? "var(--color-ink)"
                      : "transparent",
                  border: isUpcoming
                    ? "1px solid var(--color-line)"
                    : "1px solid transparent",
                  color: isCompleted || isActive ? "#fff" : "var(--color-ink-mute)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : step.nummer}
              </span>
              <span
                className="text-[11px] uppercase font-medium hidden sm:inline"
                style={{
                  letterSpacing: "0.22em",
                  color:         isActive
                    ? "var(--color-ink)"
                    : isCompleted
                      ? "var(--color-coral)"
                      : "var(--color-ink-mute)",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Verbindungslinie zwischen Schritten */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="block"
                style={{
                  width:      24,
                  height:     1,
                  background: i < currentIndex
                    ? "var(--color-coral)"
                    : "var(--color-line)",
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
