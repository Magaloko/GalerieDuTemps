"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { X, Package, Mail, MapPin, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useModuleBase } from "@/lib/module-base-client";
import { formatPreis } from "@/lib/utils/preis";
import { ORDER_STATUS_META } from "@/lib/utils/order-status";
import type { Order } from "@/types/commerce";

/* ──────────────────────────────────────────────────────────────────────────
 * OrderPeek — Side-Peek / Slide-over für eine Bestellung (Twenty-Signatur).
 *
 * Global einmal gemountet (neben CommandMenu in app-shell + admin-layout).
 * Lauscht auf window-Event "gdt:peek-order" (detail = orderId), fetcht das
 * Detail via /api/admin/bestellungen/[id] und zeigt es in einem von rechts
 * gleitenden Panel — die Liste bleibt sichtbar. „Открыть полностью" führt zur
 * vollen Detail-Seite. Esc / Backdrop / X schließt.
 * ────────────────────────────────────────────────────────────────────────── */

const PAY_STATUS_LABEL: Record<string, string> = {
  unpaid: "Не оплачен", pending: "Ожидает оплаты", partial: "Предоплата внесена",
  paid: "Оплачен полностью", refunded: "Возврат", failed: "Ошибка оплаты",
};

export function OrderPeek() {
  const base = useModuleBase();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const schliessen = useCallback(() => setOrderId(null), []);

  // Event-Listener: Zeile feuert window.dispatchEvent(new CustomEvent("gdt:peek-order", {detail:id}))
  useEffect(() => {
    const onPeek = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setOrderId(id);
    };
    window.addEventListener("gdt:peek-order", onPeek);
    return () => window.removeEventListener("gdt:peek-order", onPeek);
  }, []);

  // Esc schließt + Body-Scroll sperren solange offen.
  useEffect(() => {
    if (!orderId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") schliessen(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [orderId, schliessen]);

  // Detail laden, wenn orderId wechselt.
  useEffect(() => {
    if (!orderId) { setOrder(null); setFehler(null); return; }
    let abbruch = false;
    setLaedt(true); setFehler(null); setOrder(null);
    fetch(`/api/admin/bestellungen/${orderId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
      .then(d => { if (!abbruch) setOrder(d.order); })
      .catch(() => { if (!abbruch) setFehler("Не удалось загрузить заказ"); })
      .finally(() => { if (!abbruch) setLaedt(false); });
    return () => { abbruch = true; };
  }, [orderId]);

  if (!orderId) return null;

  const st = order ? ORDER_STATUS_META[order.status] : null;
  const addr = order?.shipping_address;
  const hatAddr = addr && (addr.vorname || addr.nachname || addr.strasse);

  return (
    <div className="peek-root" role="dialog" aria-modal="true" aria-label="Детали заказа">
      <div className="peek-backdrop" onClick={schliessen} />
      <aside className="peek-panel">
        {/* Kopf */}
        <header className="peek-head">
          <div className="min-w-0">
            <p className="eyebrow">Заказ</p>
            <p className="peek-title">
              {order ? `GDT-${String(order.order_number).padStart(4, "0")}` : "…"}
            </p>
          </div>
          <button onClick={schliessen} className="row-action" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Inhalt */}
        <div className="peek-body">
          {laedt && (
            <div className="flex items-center justify-center py-16" style={{ color: "var(--color-ink-mute)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {fehler && !laedt && (
            <p className="text-sm text-center py-16" style={{ color: "var(--color-vintage-burgundy)" }}>{fehler}</p>
          )}

          {order && !laedt && (
            <>
              {/* Status + Summe */}
              <div className="flex items-center justify-between gap-3">
                {st && (
                  <span className="chip" style={{ background: "transparent", color: st.color, border: `1px solid ${st.color}` }}>
                    {st.label}
                  </span>
                )}
                <span className="peek-total">{formatPreis(order.total_cents / 100)}</span>
              </div>

              {/* Kunde */}
              <section className="record-card">
                <h3 className="record-section-title mb-3"><Mail className="w-3.5 h-3.5" /> Клиент</h3>
                <div className="field-group">
                  <div className="field-row">
                    <span className="field-label">Имя</span>
                    <span className="field-value">{order.customer_name ?? "Гость"}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">E-mail</span>
                    <span className="field-value">{order.customer_email}</span>
                  </div>
                  <div className="field-row">
                    <span className="field-label">Дата</span>
                    <span className="field-value">{new Date(order.erstellt_am).toLocaleString("ru-RU")}</span>
                  </div>
                </div>
              </section>

              {/* Positionen */}
              {order.items && order.items.length > 0 && (
                <section className="record-card">
                  <h3 className="record-section-title mb-3"><Package className="w-3.5 h-3.5" /> Товары</h3>
                  <div style={{ borderTop: "1px solid var(--color-line)" }}>
                    {order.items.map(it => (
                      <div key={it.id} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: "1px solid var(--color-line)" }}>
                        <div className="min-w-0">
                          <p className="field-value truncate">{it.produkt_name}</p>
                          <p className="field-label">{it.menge}× · {formatPreis(it.einzelpreis_cents / 100)}</p>
                        </div>
                        <span className="field-value" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatPreis(it.zeile_total_cents / 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="amount-row amount-row-total mt-2">
                    <span>Итого</span><span>{formatPreis(order.total_cents / 100)}</span>
                  </div>
                </section>
              )}

              {/* Adresse */}
              {hatAddr && (
                <section className="record-card">
                  <h3 className="record-section-title mb-3"><MapPin className="w-3.5 h-3.5" /> Доставка</h3>
                  <p className="field-value" style={{ lineHeight: 1.6 }}>
                    {addr.vorname} {addr.nachname}<br />
                    {addr.strasse}<br />
                    {addr.plz} {addr.ort}<br />
                    {addr.land}
                  </p>
                </section>
              )}

              {/* Zahlung */}
              <section className="record-card">
                <h3 className="record-section-title mb-3"><CreditCard className="w-3.5 h-3.5" /> Оплата</h3>
                <div className="field-group">
                  <div className="field-row">
                    <span className="field-label">Статус оплаты</span>
                    <span className="field-value">{PAY_STATUS_LABEL[order.payment_status ?? ""] ?? (order.payment_status || "—")}</span>
                  </div>
                  {order.payment_method && (
                    <div className="field-row">
                      <span className="field-label">Способ</span>
                      <span className="field-value">{order.payment_method}</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Fuß: voll öffnen */}
        {order && (
          <footer className="peek-foot">
            <Link href={`${base}/bestellungen/${order.id}`} className="btn-coral btn-coral-sm" onClick={schliessen}>
              <ExternalLink className="w-3.5 h-3.5" /> Открыть полностью
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
