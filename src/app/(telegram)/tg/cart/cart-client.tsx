"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trash2, ChevronLeft } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useCartSync } from "@/hooks/use-cart-sync";
import { formatPreis } from "@/lib/utils/preis";
import { mainButtonOffClick } from "../tg-webapp";

/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Cart-Client
 *
 * Liest den localStorage-Cart (gleicher Store wie /warenkorb). Zeigt Items
 * mit Bild + Name + Preis + Remove-Button. Telegram-MainButton steuert
 * den Checkout: bei Tap POST zu /api/telegram/checkout, der sendInvoice
 * im Bot ausführt — Telegram zeigt dann sein natives Payment-Sheet.
 *
 * Bei leerem Cart wird MainButton versteckt.
 * ────────────────────────────────────────────────────────────────────────── */
export function CartClient() {
  // Mini-App Cart synchronisiert mit Server-Cart bei linked Customer.
  // Polling alle 8s aktiv — wenn der User parallel auf Web etwas in den
  // Cart legt und dann zurück in den Bot wechselt, ist es da. (Telegram
  // pausiert WebView wenn der User wegswitcht, daher reicht 8s polling
  // statt SSE/WebSocket.)
  useCartSync({ pollMs: 8000 });

  const items     = useCart(s => s.items);
  const entfernen = useCart(s => s.entfernen);
  const leeren    = useCart(s => s.leeren);
  const router    = useRouter();
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);
  const ref = useRef(false);

  const totalCents = items.reduce(
    (acc, it) => acc + it.einzelpreis_cents * it.menge, 0,
  );

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    const main = tg.MainButton;
    if (items.length === 0) {
      main.hide();
      return;
    }
    main.setText(`Оплатить · ${formatPreis(totalCents / 100)}`);
    main.show();

    const onClick = async () => {
      if (ref.current || busy) return;
      ref.current = true;
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch("/api/telegram/checkout", {
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({
            items: items.map(it => ({
              produkt_id:        it.produkt_id,
              name:              it.name,
              menge:             it.menge,
              einzelpreis_cents: it.einzelpreis_cents,
            })),
          }),
          credentials: "include",
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        // Bei Erfolg: sendInvoice wurde abgesetzt, Telegram zeigt Payment-Sheet
        // automatisch. Wir leeren den Cart erst beim successful_payment-Webhook
        // (im Telegram-Webhook-Handler) — bis dahin bleibt Cart sichtbar.
        const haptic = (tg as unknown as { HapticFeedback?: { notificationOccurred: (s: string) => void } }).HapticFeedback;
        try { haptic?.notificationOccurred("success"); } catch {}
      } catch (e) {
        setErr(String(e instanceof Error ? e.message : e));
      } finally {
        setBusy(false);
        ref.current = false;
      }
    };
    main.onClick(onClick);

    return () => { mainButtonOffClick(main, onClick); main.hide(); };
  }, [items, totalCents, busy, router]);

  return (
    <main className="p-4 pb-32">
      <div className="mb-4">
        <Link
          href="/tg"
          className="inline-flex items-center gap-1 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.18em",
            color:         "var(--tg-theme-link-color, var(--color-coral))",
          }}
        >
          <ChevronLeft className="w-3 h-3" /> Каталог
        </Link>
        <h1
          className="mt-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--tg-theme-text-color, var(--color-ink))",
          }}
        >
          Корзина
        </h1>
      </div>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map(it => (
              <li
                key={it.produkt_id}
                className="flex items-stretch gap-3 p-3"
                style={{
                  background: "var(--tg-theme-section-bg-color, #fff)",
                  border:     "1px solid var(--color-line)",
                }}
              >
                <div
                  className="relative shrink-0"
                  style={{ width: 56, height: 70, background: "var(--color-paper-warm)" }}
                >
                  {it.bild_url && (
                    <Image
                      src={it.bild_url}
                      alt={it.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="line-clamp-2"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize:   15,
                      lineHeight: 1.2,
                      color:      "var(--tg-theme-text-color, var(--color-ink))",
                    }}
                  >
                    {it.name}
                  </p>
                  <p
                    className="mt-1 text-[12px]"
                    style={{ color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}
                  >
                    {it.menge} × {formatPreis(it.einzelpreis_cents / 100)}
                  </p>
                </div>
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => entfernen(it.produkt_id)}
                    aria-label="Удалить"
                    className="p-1"
                    style={{
                      color:        "var(--tg-theme-destructive-text-color, var(--color-coral-deep))",
                      touchAction:  "manipulation",
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize:   15,
                      color:      "var(--tg-theme-text-color, var(--color-ink))",
                    }}
                  >
                    {formatPreis((it.einzelpreis_cents * it.menge) / 100)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div
            className="mt-4 p-3 flex items-center justify-between"
            style={{
              background: "var(--tg-theme-section-bg-color, var(--color-bone))",
              border:     "1px solid var(--color-line)",
            }}
          >
            <span
              className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
            >
              Итого
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   22,
                color:      "var(--tg-theme-text-color, var(--color-ink))",
              }}
            >
              {formatPreis(totalCents / 100)}
            </span>
          </div>

          {err && (
            <p
              className="mt-3 px-3 py-2 text-[13px]"
              style={{
                background: "rgba(232,112,58,0.08)",
                border:     "1px solid rgba(232,112,58,0.35)",
                color:      "var(--color-coral-deep)",
              }}
            >
              {err}
            </p>
          )}

          <button
            type="button"
            onClick={leeren}
            className="mt-4 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
          >
            Очистить корзину
          </button>
        </>
      )}
    </main>
  );
}

function EmptyCart() {
  return (
    <div className="py-16 text-center">
      <p
        className="text-[10px] uppercase font-medium mb-2"
        style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
      >
        Корзина · 0
      </p>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   24,
          color:      "var(--tg-theme-text-color, var(--color-ink))",
        }}
      >
        Пока пусто
      </h2>
      <Link
        href="/tg"
        className="inline-block mt-6 text-[12px] uppercase font-medium"
        style={{
          letterSpacing: "0.22em",
          color:         "var(--tg-theme-link-color, var(--color-coral))",
        }}
      >
        В каталог →
      </Link>
    </div>
  );
}
