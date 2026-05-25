import { notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import { CartLeerenClient } from "./cart-leeren-client";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: "Заказ оформлен — Galerie du Temps" };
export const dynamic = "force-dynamic";

export default async function ErfolgPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, { t }] = await Promise.all([orderById(id), getDictionary()]);
  if (!order) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <CartLeerenClient />

      <div className="text-center mb-10">
        <div className="inline-flex p-4 bg-vintage-sage/10 border border-vintage-sage/30 mb-6" style={{ borderRadius: "50%" }}>
          <CheckCircle2 className="w-10 h-10 text-vintage-sage" />
        </div>
        <p className="text-vintage-gold text-xs tracking-widest uppercase mb-2">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso mb-3">
          {t.cart.danke}
        </h1>
        <p className="text-vintage-dust font-sans">
          {t.cart.bestaetigung_text} <strong className="text-vintage-brown">{order.customer_email}</strong>
        </p>
      </div>

      <div className="bg-vintage-white border border-vintage-sand p-6 space-y-5" style={{ borderRadius: "var(--radius-card)" }}>
        {/* Bestellnummer */}
        <div className="flex items-center justify-between pb-4 border-b border-vintage-sand">
          <div>
            <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust">{t.cart.bestellnummer}</p>
            <p className="font-mono text-xl text-vintage-espresso mt-1">GDT-{order.order_number}</p>
          </div>
          <Package className="w-8 h-8 text-vintage-gold" />
        </div>

        {/* Items */}
        <div className="divide-y divide-vintage-sand/50">
          {(order.items ?? []).map(item => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <div className="w-12 h-12 bg-vintage-parchment overflow-hidden flex-shrink-0" style={{ borderRadius: "var(--radius-vintage)" }}>
                {item.produkt_bild_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.produkt_bild_url} alt={item.produkt_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-vintage-sand">✦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-serif text-vintage-espresso truncate">{item.produkt_name}</p>
                <p className="text-xs text-vintage-dust font-sans">{item.menge} × {formatPreis(item.einzelpreis_cents / 100)}</p>
              </div>
              <p className="font-serif text-vintage-espresso">{formatPreis(item.zeile_total_cents / 100)}</p>
            </div>
          ))}
        </div>

        {/* Summen */}
        <div className="space-y-1 text-sm font-sans border-t border-vintage-sand pt-4">
          <div className="flex justify-between text-vintage-dust">
            <span>{t.cart.zwischensumme}</span><span>{formatPreis(order.subtotal_cents / 100)}</span>
          </div>
          {order.rabatt_cents > 0 && (
            <div className="flex justify-between text-vintage-sage">
              <span>{t.cart.rabatt}</span><span>− {formatPreis(order.rabatt_cents / 100)}</span>
            </div>
          )}
          <div className="flex justify-between text-vintage-dust text-xs">
            <span>{t.cart.inkl_ust}</span><span>{formatPreis(order.tax_total_cents / 100)}</span>
          </div>
          <div className="flex justify-between font-serif text-vintage-espresso text-lg pt-2 border-t border-vintage-sand">
            <span>{t.cart.gezahlt}</span><span>{formatPreis(order.total_cents / 100)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Link
          href="/katalog"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-vintage-espresso text-vintage-cream font-sans text-xs tracking-widest uppercase hover:bg-vintage-brown transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          {t.cart.weiter_stoebern} <ArrowRight className="w-4 h-4" />
        </Link>
        {order.customer_id && (
          <Link
            href={`/kunde/bestellungen/${order.id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-vintage-sand text-vintage-brown font-sans text-xs tracking-widest uppercase hover:bg-vintage-parchment transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {t.cart.zum_konto}
          </Link>
        )}
      </div>
    </div>
  );
}
