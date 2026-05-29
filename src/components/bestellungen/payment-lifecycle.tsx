"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Handshake, CheckCircle2 } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { anzahlungErhaltenAction, vollBezahltAction } from "@/app/(admin)/admin/bestellungen/actions";

/* ──────────────────────────────────────────────────────────────────────────
 * Payment-Lifecycle-Buttons für die Web-Admin Order-Detail.
 *
 * Spiegelt den Anzahlung-Flow der Mini-App (/tg/admin/orders):
 *  - vor_ort_anzahlung, payment_status pending/unpaid → „Предоплата получена"
 *  - vor_ort_anzahlung, payment_status partial        → „Остаток получен · оплачен"
 *  - andere Methoden, noch nicht paid                 → „Отметить оплаченным"
 * ────────────────────────────────────────────────────────────────────────── */
export function PaymentLifecycle({
  orderId, paymentMethod, paymentStatus, anzahlungCents, restCents,
}: {
  orderId: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  anzahlungCents: number | null;
  restCents: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    start(async () => {
      const r = await fn();
      setFlash({ ok: r.ok, msg: r.ok ? (r.message ?? "Готово") : (r.error ?? "Ошибка") });
      if (r.ok) router.refresh();
      setTimeout(() => setFlash(null), 3000);
    });
  };

  const isAnzahlung = paymentMethod === "vor_ort_anzahlung";
  const istVollBezahlt = paymentStatus === "paid";

  // Nichts zu tun, wenn schon voll bezahlt.
  if (istVollBezahlt) return null;

  const btnBase = "w-full flex items-center justify-center gap-2 py-2.5 text-xs uppercase tracking-wider font-sans transition-colors disabled:opacity-40";

  return (
    <div className="space-y-2 pt-2 border-t border-vintage-sand/60">
      {isAnzahlung ? (
        <>
          {(paymentStatus === "pending" || paymentStatus === "unpaid" || !paymentStatus) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => anzahlungErhaltenAction(orderId))}
              className={btnBase}
              style={{ background: "rgba(232,112,58,0.12)", color: "var(--color-coral-deep, #C95820)", border: "1px solid rgba(232,112,58,0.45)", borderRadius: "var(--radius-vintage)" }}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
              Предоплата получена{anzahlungCents ? ` (${formatPreis(anzahlungCents / 100)})` : ""}
            </button>
          )}
          {paymentStatus === "partial" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => vollBezahltAction(orderId))}
              className={btnBase}
              style={{ background: "rgba(127,140,90,0.14)", color: "#52663F", border: "1px solid rgba(127,140,90,0.45)", borderRadius: "var(--radius-vintage)" }}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Остаток получен{restCents > 0 ? ` (${formatPreis(restCents / 100)})` : ""} · выдан
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => vollBezahltAction(orderId))}
          className={btnBase}
          style={{ background: "rgba(127,140,90,0.14)", color: "#52663F", border: "1px solid rgba(127,140,90,0.45)", borderRadius: "var(--radius-vintage)" }}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Отметить оплаченным
        </button>
      )}

      {flash && (
        <p className="text-xs font-sans" style={{ color: flash.ok ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
          {flash.msg}
        </p>
      )}
    </div>
  );
}
