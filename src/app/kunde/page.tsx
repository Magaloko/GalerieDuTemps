import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { customerById } from "@/lib/db/customers";
import { ordersFuerCustomer } from "@/lib/db/orders";
import { formatPreis } from "@/lib/utils/preis";
import {
  ShoppingBag, UserCircle, Briefcase, ArrowRight, Heart, Package,
  Clock,
} from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";
import { orderStatusMeta } from "@/lib/utils/order-status";

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
  const aktiveOrders   = orders.filter(o => ["pending", "paid", "fulfilled"].includes(o.status));
  const gesamtAusgaben = orders.filter(o => o.status !== "cancelled").reduce((a, o) => a + o.total_cents, 0);

  // Greeting nach Tageszeit (Almaty +6h von UTC) — gibt persönlicheres Gefühl
  const hr = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", hour12: false });
  const stunde = parseInt(hr, 10);
  const gruss = stunde < 5 ? "Доброй ночи"
             : stunde < 12 ? "Доброе утро"
             : stunde < 18 ? "Добрый день"
             :               "Добрый вечер";

  return (
    <div className="space-y-10 max-w-5xl">

      {/* ─── Hero / Greeting ─────────────────────────────────── */}
      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ {gruss}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   "clamp(2rem, 4vw, 2.75rem)",
            color:      "var(--color-ink)",
            lineHeight: 1.05,
          }}
        >
          {customer.vorname || "Клиент"}
          {customer.vorname && (
            <em
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-coral)",
              }}
            >
              .
            </em>
          )}
        </h1>
        <p
          className="text-sm mt-2"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          {t.kunde.kundennummer}:{" "}
          <span
            className="font-mono not-italic text-xs"
            style={{ color: "var(--color-ink)" }}
          >
            KD-{customer.customer_number != null ? customer.customer_number.toString().padStart(4, "0") : "—"}
          </span>
        </p>
      </header>

      {/* ─── B2B-Pending-Hinweis ─────────────────────────────── */}
      {customer.customer_type === "b2b_pending" && (
        <div
          className="flex items-start gap-3 p-5"
          style={{
            background: "rgba(201, 168, 76, 0.10)",
            border:     "1px solid rgba(201, 168, 76, 0.40)",
            borderLeft: "3px solid #C9A84C",
          }}
        >
          <Briefcase className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#C9A84C" }} />
          <div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   16,
                color:      "var(--color-ink)",
              }}
            >
              {t.kunde.b2b_pruefung_titel}
            </p>
            <p
              className="text-sm mt-1"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-soft)",
                lineHeight: 1.5,
              }}
            >
              {t.kunde.b2b_pruefung_text}
            </p>
          </div>
        </div>
      )}

      {/* ─── Stat-Karten ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label={t.kunde.stat_bestellungen_gesamt}
          wert={orders.length}
          icon={Package}
          href="/kunde/bestellungen"
        />
        <StatCard
          label={t.kunde.stat_offene_bestellungen}
          wert={aktiveOrders.length}
          icon={Clock}
        />
        <StatCard
          label={t.kunde.stat_gesamtsumme}
          wert={formatPreis(gesamtAusgaben / 100)}
          icon={UserCircle}
        />
      </div>

      {/* ─── Letzte Bestellungen ─────────────────────────────── */}
      <section
        className="p-6 md:p-8"
        style={{ background: "#fff", border: "1px solid var(--color-line)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
          >
            {t.kunde.letzte_bestellungen}
          </h2>
          {orders.length > 0 && (
            <Link
              href="/kunde/bestellungen"
              className="text-[11px] uppercase font-medium flex items-center gap-1 transition-colors hover:text-[var(--color-coral)]"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              {t.kunde.alle_ansehen} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-ink-mute)" }} />
            <p
              className="mb-5"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-soft)",
              }}
            >
              {t.kunde.keine_bestellungen_kurz}
            </p>
            <Link
              href="/katalog"
              className="btn-coral btn-coral-sm inline-flex items-center gap-2"
            >
              {t.cart.zum_katalog} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--color-line)" }}>
            {orders.slice(0, 5).map(o => {
              const meta = orderStatusMeta(o.status);
              return (
                <li key={o.id}>
                  <Link
                    href={`/kunde/bestellungen/${o.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 transition-colors hover:bg-[var(--color-bone)]"
                  >
                    <div className="min-w-0">
                      <p
                        className="font-mono text-sm"
                        style={{ color: "var(--color-ink)" }}
                      >
                        GDT-{o.order_number}
                      </p>
                      <p
                        className="text-[11px] mt-0.5"
                        style={{
                          fontFamily: "var(--font-italic)",
                          fontStyle:  "italic",
                          color:      "var(--color-ink-mute)",
                        }}
                      >
                        {new Date(o.erstellt_am).toLocaleDateString(bcp47)} ·{" "}
                        <span style={{ color: meta.color, fontStyle: "normal" }}>{meta.label}</span>
                      </p>
                    </div>
                    <p
                      className="font-mono tabular-nums text-sm shrink-0"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {formatPreis(o.total_cents / 100)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Schnellzugriff ──────────────────────────────────── */}
      <section className="grid sm:grid-cols-3 gap-3">
        {[
          { href: "/kunde/profil", label: t.kunde.profil_bearbeiten, icon: UserCircle },
          { href: "/wunschliste",  label: t.nav.wunschliste,         icon: Heart      },
          { href: "/katalog",      label: t.kunde.weiter_stoebern,   icon: ArrowRight },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 transition-shadow hover:shadow-soft"
            style={{
              background: "#fff",
              border:     "1px solid var(--color-line)",
            }}
          >
            <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
            <span
              className="text-sm flex-1"
              style={{
                fontFamily: "var(--font-display)",
                color:      "var(--color-ink)",
              }}
            >
              {label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" style={{ color: "var(--color-ink)" }} />
          </Link>
        ))}
      </section>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────── */

function StatCard({
  label, wert, icon: Icon, href,
}: {
  label: string;
  wert:  string | number;
  icon:  React.ElementType;
  href?: string;
}) {
  const inner = (
    <div
      className="p-5 transition-shadow"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
        <p
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
        >
          {label}
        </p>
      </div>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   28,
          color:      "var(--color-ink)",
          lineHeight: 1,
        }}
      >
        {wert}
      </p>
    </div>
  );
  return href ? <Link href={href} className="block hover:shadow-soft transition-shadow">{inner}</Link> : inner;
}
