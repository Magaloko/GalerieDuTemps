import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { orderById } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { ChevronLeft, Package, FileText, Truck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bestelldetail" };
export const dynamic = "force-dynamic";

export default async function BestelldetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const { id } = await params;
  const order = await orderById(id);
  if (!order) notFound();
  if (order.customer_id !== session.user.id) notFound();   // Ownership

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/kunde/bestellungen" className="hover:text-vintage-brown flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-3 h-3" /> Meine Bestellungen
        </Link>
        <span>/</span>
        <span className="font-mono text-vintage-gold">GDT-{order.order_number}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <section className="lg:col-span-2 bg-vintage-white border border-vintage-sand p-6 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <Package className="w-4 h-4 text-vintage-gold" /> Artikel
          </h2>
          <div className="divide-y divide-vintage-sand/50">
            {(order.items ?? []).map(item => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <div className="w-14 h-14 bg-vintage-parchment overflow-hidden flex-shrink-0" style={{ borderRadius: "var(--radius-vintage)" }}>
                  {item.produkt_bild_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.produkt_bild_url} alt={item.produkt_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-vintage-sand">✦</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.produkt_slug ? (
                    <Link href={`/katalog/${item.produkt_slug}`} className="font-serif text-vintage-espresso hover:text-vintage-brown transition-colors truncate">
                      {item.produkt_name}
                    </Link>
                  ) : (
                    <p className="font-serif text-vintage-espresso truncate">{item.produkt_name}</p>
                  )}
                  <p className="text-xs text-vintage-dust font-sans">
                    {item.menge}× {formatPreis(item.einzelpreis_cents / 100)}
                  </p>
                </div>
                <p className="font-serif text-vintage-espresso">{formatPreis(item.zeile_total_cents / 100)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm font-sans border-t border-vintage-sand pt-4">
            <div className="flex justify-between text-vintage-dust"><span>Zwischensumme</span><span>{formatPreis(order.subtotal_cents / 100)}</span></div>
            {order.rabatt_cents > 0 && <div className="flex justify-between text-vintage-sage"><span>Rabatt</span><span>− {formatPreis(order.rabatt_cents / 100)}</span></div>}
            <div className="flex justify-between text-vintage-dust text-xs"><span>inkl. USt.</span><span>{formatPreis(order.tax_total_cents / 100)}</span></div>
            <div className="flex justify-between font-serif text-vintage-espresso text-lg pt-2 border-t border-vintage-sand"><span>Summe</span><span>{formatPreis(order.total_cents / 100)}</span></div>
          </div>
        </section>

        {/* Meta */}
        <div className="space-y-4">
          <section className="bg-vintage-white border border-vintage-sand p-5 space-y-2" style={{ borderRadius: "var(--radius-card)" }}>
            <h3 className="font-serif text-vintage-espresso">Status</h3>
            <p className="font-serif text-lg text-vintage-gold uppercase">{order.status}</p>
            {order.bezahlt_am && <p className="text-xs text-vintage-dust">Bezahlt am {new Date(order.bezahlt_am).toLocaleDateString("de-DE")}</p>}
          </section>

          {order.tracking_nummer && (
            <section className="bg-vintage-white border border-vintage-sand p-5 space-y-2" style={{ borderRadius: "var(--radius-card)" }}>
              <h3 className="font-serif text-vintage-espresso flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-vintage-gold" /> Versand
              </h3>
              <p className="text-sm font-mono text-vintage-brown">{order.tracking_nummer}</p>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" className="text-xs text-vintage-brown underline">
                  Sendung verfolgen
                </a>
              )}
            </section>
          )}

          <a
            href={`/api/orders/${order.id}/rechnung`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-3 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <FileText className="w-3.5 h-3.5" /> Rechnung als PDF
          </a>
        </div>
      </div>
    </div>
  );
}
