import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ordersFuerCustomer } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { ShoppingBag, ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import type { OrderStatus } from "@/types/commerce";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: "Мои заказы" };
export const dynamic = "force-dynamic";

export default async function MeineBestellungenPage() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const [orders, { t, locale }] = await Promise.all([
    ordersFuerCustomer(session.user.id),
    getDictionary(),
  ]);
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  const STATUS_LABEL: Record<OrderStatus, { label: string; klasse: string }> = {
    pending:   { label: t.kunde.status_pending,   klasse: "text-vintage-gold     bg-vintage-gold/10"     },
    paid:      { label: t.kunde.status_paid,      klasse: "text-vintage-sage     bg-vintage-sage/10"     },
    fulfilled: { label: t.kunde.status_fulfilled, klasse: "text-vintage-forest   bg-vintage-forest/10"   },
    completed: { label: t.kunde.status_completed, klasse: "text-vintage-forest   bg-vintage-forest/10"   },
    cancelled: { label: t.kunde.status_cancelled, klasse: "text-vintage-dust     bg-vintage-dust/10"     },
    refunded:  { label: t.kunde.status_refunded,  klasse: "text-vintage-burgundy bg-vintage-burgundy/10" },
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso">{t.kunde.bestellungen_titel}</h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">{orders.length} {t.kunde.bestellungen_count}</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <ShoppingBag className="w-12 h-12 text-vintage-sand mb-4" />
          <p className="font-serif text-lg text-vintage-brown">{t.kunde.keine_bestellungen_kurz}</p>
          <Link href="/katalog" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
            {t.cart.zum_katalog} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const s = STATUS_LABEL[o.status];
            return (
              <Link key={o.id} href={`/kunde/bestellungen/${o.id}`}
                className="flex items-center justify-between p-5 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-card)" }}>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-vintage-gold text-lg">GDT-{o.order_number}</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-sans ${s.klasse}`} style={{ borderRadius: "var(--radius-vintage)" }}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-vintage-dust font-sans mt-1">
                    {t.kunde.bestellt_am} {new Date(o.erstellt_am).toLocaleDateString(bcp47)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-serif text-vintage-espresso text-lg">{formatPreis(o.total_cents / 100)}</p>
                  <ExternalLink className="w-4 h-4 text-vintage-dust" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
