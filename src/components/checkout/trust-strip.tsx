import { ShieldCheck, RotateCcw, Headphones, Truck } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * TrustStrip — Vier-Säulen-Vertrauenssignal unterm Cart/Checkout.
 *
 * Senkt Cart-Abandonment indem die häufigsten Bedenken (Sicherheit,
 * Rückgabe, Support, Versand) prominent vor dem Klick adressiert werden.
 *
 * Optisch zurückhaltend — Ink-mute mit Coral-Hover damit es als Reassurance
 * wirkt und nicht als Marketing-Banner.
 * ────────────────────────────────────────────────────────────────────────── */

const ITEMS = [
  { icon: ShieldCheck, label: "Безопасная оплата", sub: "SSL · 3D-Secure" },
  { icon: RotateCcw,   label: "Возврат 14 дней",    sub: "Без вопросов"   },
  { icon: Truck,       label: "Доставка по СНГ",    sub: "Kazpost · СДЭК"  },
  { icon: Headphones,  label: "Поддержка",         sub: "WhatsApp · Mail" },
];

export function TrustStrip() {
  return (
    <ul
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6"
      style={{ borderTop: "1px solid var(--color-line)" }}
    >
      {ITEMS.map(({ icon: Icon, label, sub }) => (
        <li key={label} className="flex items-start gap-2.5">
          <Icon
            className="w-4 h-4 mt-0.5 shrink-0"
            style={{ color: "var(--color-coral)" }}
          />
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase font-medium leading-tight"
              style={{
                letterSpacing: "0.18em",
                color:         "var(--color-ink)",
              }}
            >
              {label}
            </p>
            <p
              className="text-[10px] mt-0.5 leading-tight"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              {sub}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
