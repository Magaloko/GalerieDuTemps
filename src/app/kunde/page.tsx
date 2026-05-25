import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { customerById } from "@/lib/db/customers";
import { ordersFuerCustomer } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import { ShoppingBag, UserCircle, Briefcase, ArrowRight, Heart, Package } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = { title: "Обзор" };
export const dynamic = "force-dynamic";

export default async function KundeDashboard() {
  const session = await auth();
  if (!session || session.user?.role !== "customer") redirect("/kunde/anmelden");

  const [customer, orders, { t, locale }] = await Promise.all([
    customerById(session.user.id),
    ordersFuerCustomer(session.user.id).catch(() => []),
    getDictionary(),
  ]);
  if (!customer) redirect("/kunde/anmelden");

  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";
  const aktiveOrders = orders.filter(o => ["pending", "paid", "fulfilled"].includes(o.status));
  const gesamtAusgaben = orders.filter(o => o.status !== "cancelled").reduce((acc, o) => acc + o.total_cents, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-vintage-gold text-sm tracking-widest">✦</p>
        <h1 className="font-serif text-3xl text-vintage-espresso mt-1">
          {t.kunde.hallo}{customer.vorname ? `, ${customer.vorname}` : ""}!
        </h1>
        <p className="text-vintage-dust text-sm font-sans mt-1">
          {t.kunde.kundennummer}: <strong className="font-mono text-vintage-brown">KD-{customer.customer_number.toString().padStart(4, "0")}</strong>
        </p>
      </div>

      {/* B2B-Pending-Hinweis */}
      {customer.customer_type === "b2b_pending" && (
        <div className="flex items-start gap-3 p-5 bg-vintage-gold/10 border border-vintage-gold/30" style={{ borderRadius: "var(--radius-card)" }}>
          <Briefcase className="w-5 h-5 text-vintage-gold flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-serif text-vintage-espresso">{t.kunde.b2b_pruefung_titel}</p>
            <p className="text-vintage-brown text-sm font-sans mt-1">{t.kunde.b2b_pruefung_text}</p>
          </div>
        </div>
      )}

      {/* Stat-Karten */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={t.kunde.stat_bestellungen_gesamt} wert={orders.length} icon={Package} href="/kunde/bestellungen" />
        <StatCard label={t.kunde.stat_offene_bestellungen} wert={aktiveOrders.length} icon={ShoppingBag} />
        <StatCard label={t.kunde.stat_gesamtsumme} wert={formatPreis(gesamtAusgaben / 100)} icon={UserCircle} />
      </div>

      {/* Letzte Bestellungen */}
      <section className="bg-vintage-white border border-vintage-sand p-6" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-vintage-espresso">{t.kunde.letzte_bestellungen}</h2>
          <Link href="/kunde/bestellungen" className="text-xs font-sans text-vintage-brown hover:text-vintage-espresso transition-colors flex items-center gap-1">
            {t.kunde.alle_ansehen} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingBag className="w-10 h-10 text-vintage-sand mx-auto mb-3" />
            <p className="font-serif text-vintage-brown">{t.kunde.keine_bestellungen_kurz}</p>
            <Link href="/katalog" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors" style={{ borderRadius: "var(--radius-button)" }}>
              {t.cart.zum_katalog} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-vintage-sand/40">
            {orders.slice(0, 5).map(o => (
              <Link key={o.id} href={`/kunde/bestellungen/${o.id}`}
                className="py-3 flex items-center justify-between hover:bg-vintage-parchment/40 -mx-2 px-2 transition-colors">
                <div>
                  <p className="font-mono text-sm text-vintage-gold">GDT-{o.order_number}</p>
                  <p className="text-xs text-vintage-dust font-sans">
                    {new Date(o.erstellt_am).toLocaleDateString(bcp47)} · {o.status}
                  </p>
                </div>
                <p className="font-serif text-vintage-espresso">{formatPreis(o.total_cents / 100)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Schnellzugriff */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { href: "/kunde/profil",    label: t.kunde.profil_bearbeiten, icon: UserCircle },
          { href: "/wunschliste",     label: t.nav.wunschliste,         icon: Heart      },
          { href: "/katalog",         label: t.kunde.weiter_stoebern,   icon: ArrowRight },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 p-4 bg-vintage-white border border-vintage-sand hover:border-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-card)" }}>
            <Icon className="w-4 h-4 text-vintage-gold" />
            <span className="text-sm font-sans text-vintage-brown">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, wert, icon: Icon, href }: { label: string; wert: string | number; icon: React.ElementType; href?: string }) {
  const card = (
    <div className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-vintage-gold" />
        <p className="text-xs font-sans uppercase tracking-widest text-vintage-dust">{label}</p>
      </div>
      <p className="font-serif text-2xl text-vintage-espresso">{wert}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
