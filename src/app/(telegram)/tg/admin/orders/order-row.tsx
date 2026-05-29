"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, Truck, ExternalLink, Handshake } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { orderBezahltTgAction, orderVersendenTgAction, orderAnzahlungErhaltenTgAction } from "../actions";
import { haptic } from "../../fx";

interface Props {
  id:            string;
  orderNumber:   number;
  status:        "pending" | "paid";
  totalCents:    number;
  kunde:         string;
  statusLabel:   string;
  statusColor:   string;
  paymentMethod?:  string | null;
  paymentStatus?:  string | null;
  anzahlungCents?: number | null;
}

const PAY_STATUS_LABEL: Record<string, string> = {
  unpaid:  "Не оплачен",
  pending: "Ожидает оплаты",
  partial: "Предоплата внесена",
  paid:    "Оплачен полностью",
  refunded:"Возврат",
  failed:  "Ошибка оплаты",
};

/* Order-Zeile mit aufklappbaren Quick-Actions: als bezahlt markieren
 * (nur pending) + als versendet markieren mit optionalem Tracking. */
export function OrderRow(p: Props) {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [trk, setTrk]     = useState("");
  const [trkUrl, setTrkUrl] = useState("");
  const [pending, start]  = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const lock = useRef(false);   // Reentry-Sperre gegen Doppeltipp (pending wird erst verzögert true)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    if (lock.current) return;
    lock.current = true;
    start(async () => {
      try {
        const r = await fn();
        if (r.ok) { haptic("success"); router.refresh(); }
        else { haptic("error"); setFlash(r.error ?? "Ошибка"); setTimeout(() => setFlash(null), 2500); }
      } finally {
        lock.current = false;
      }
    });
  };

  return (
    <div style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", borderLeft: `3px solid ${p.statusColor}` }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-3 text-left"
        style={{ touchAction: "manipulation" }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              GDT-{p.orderNumber}
            </p>
            <span className="text-[9px] uppercase font-medium" style={{ letterSpacing: "0.18em", color: p.statusColor }}>
              {p.statusLabel}
            </span>
          </div>
          <p className="text-[11px] mt-0.5 truncate" style={{ fontFamily: "var(--font-italic)", fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
            {p.kunde}
          </p>
        </div>
        <p className="font-mono tabular-nums text-sm shrink-0" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          {formatPreis(p.totalCents / 100)}
        </p>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: "1px dashed var(--color-line)" }}>
          {/* Zahlungs-Status-Hinweis */}
          {p.paymentMethod && (
            <p className="text-[10px] uppercase font-medium pb-1"
              style={{ letterSpacing: "0.14em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              {p.paymentMethod === "vor_ort_anzahlung" ? "Самовывоз · предоплата" : null}
              {p.paymentStatus ? ` · ${PAY_STATUS_LABEL[p.paymentStatus] ?? p.paymentStatus}` : ""}
            </p>
          )}

          {/* Anzahlung-Lebenszyklus: Vorauszahlung bestätigen → bei Abholung Rest */}
          {p.paymentMethod === "vor_ort_anzahlung" ? (
            <>
              {(p.paymentStatus === "pending" || p.paymentStatus === "unpaid" || !p.paymentStatus) && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => orderAnzahlungErhaltenTgAction(p.id))}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
                  style={{ letterSpacing: "0.16em", background: "rgba(232,112,58,0.12)", color: "var(--color-coral-deep, #C95820)", border: "1px solid rgba(232,112,58,0.45)" }}
                >
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
                  Предоплата получена{p.anzahlungCents ? ` (${formatPreis(p.anzahlungCents / 100)})` : ""}
                </button>
              )}
              {p.paymentStatus === "partial" && p.status === "pending" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => orderBezahltTgAction(p.id))}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
                  style={{ letterSpacing: "0.16em", background: "rgba(127,140,90,0.14)", color: "#52663F", border: "1px solid rgba(127,140,90,0.45)" }}
                >
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  Выдан · остаток получен
                </button>
              )}
            </>
          ) : (
            /* Andere Methoden: einfache Voll-Zahlung (nur pending) */
            p.status === "pending" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => orderBezahltTgAction(p.id))}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
                style={{ letterSpacing: "0.16em", background: "rgba(127,140,90,0.14)", color: "#52663F", border: "1px solid rgba(127,140,90,0.45)" }}
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                Отметить оплаченным
              </button>
            )
          )}

          {/* Tracking + versenden */}
          <input
            type="text"
            value={trk}
            onChange={e => setTrk(e.target.value)}
            placeholder="Трек-номер (необязательно)"
            className="w-full px-2 py-1.5 text-sm"
            style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
          />
          {trk.trim() && (
            <input
              type="url"
              inputMode="url"
              value={trkUrl}
              onChange={e => setTrkUrl(e.target.value)}
              placeholder="Ссылка отслеживания (необязательно)"
              className="w-full px-2 py-1.5 text-sm"
              style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
            />
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => orderVersendenTgAction(p.id, trk.trim() ? { nummer: trk, url: trkUrl } : undefined))}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
            style={{ letterSpacing: "0.16em", background: "var(--color-coral)", color: "#fff" }}
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
            Отметить отправленным
          </button>

          {/* Voll-Detail im Web */}
          <a
            href={`/admin/bestellungen/${p.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Открыть на сайте
          </a>

          {flash && (
            <p className="text-[11px] flex items-center gap-1" style={{ color: "var(--color-coral-deep, #A53E26)" }}>
              {flash}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
