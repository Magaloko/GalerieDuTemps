import Link from "next/link";
import {
  ShoppingBag, CreditCard, Truck, UserPlus, Mail, Package,
  Activity,
} from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import type { AktivitaetsEintrag, AktivitaetsTyp } from "@/lib/db/dashboard-v2";

/**
 * ActivityFeed — Combined Timeline der letzten 24h
 *
 * Mixt: neue Orders, bezahlte Orders, Versendet, neue Customers,
 * Kontakt-Anfragen, neue Produkte.
 *
 * Jeder Eintrag: Icon (typ-spezifisch) + relative-Time + Titel + Detail
 */

const TYP_ICON: Record<AktivitaetsTyp, React.ElementType> = {
  order_created:       ShoppingBag,
  order_paid:          CreditCard,
  order_shipped:       Truck,
  customer_registered: UserPlus,
  kontakt_received:    Mail,
  lead_received:       Mail,
  product_added:       Package,
};

const TYP_COLOR: Record<AktivitaetsTyp, string> = {
  order_created:       "var(--color-coral)",
  order_paid:          "#7F8C5A",  // sage — gut für Geld-Events
  order_shipped:       "#52663F",  // forest — Erfolgs-Event
  customer_registered: "var(--color-cobalt, #1A2342)",
  kontakt_received:    "#C9A84C",  // gold — Aufmerksamkeit
  lead_received:       "#C9A84C",
  product_added:       "var(--color-ink-mute)",
};

export function ActivityFeed({ eintraege }: { eintraege: AktivitaetsEintrag[] }) {
  return (
    <section
      className="bg-vintage-white border border-vintage-sand p-6"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-vintage-gold" /> Активность · 24 ч
      </h2>

      {eintraege.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Activity className="w-8 h-8 text-vintage-sand mb-2" />
          <p className="text-sm font-sans text-vintage-dust">Пока тихо за последние 24 часа</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {eintraege.map((e, i) => (
            <FeedItem key={i} eintrag={e} />
          ))}
        </ol>
      )}
    </section>
  );
}

function FeedItem({ eintrag }: { eintrag: AktivitaetsEintrag }) {
  const Icon = TYP_ICON[eintrag.typ];
  const color = TYP_COLOR[eintrag.typ];
  const zeit = formatRelativ(eintrag.zeitstempel);

  const inner = (
    <li
      className="flex items-start gap-3 group"
    >
      {/* Icon */}
      <div
        className="shrink-0 w-8 h-8 flex items-center justify-center mt-0.5"
        style={{
          background:   "rgba(15, 20, 48, 0.04)",
          border:       `1px solid ${color}33`,
          borderRadius: "999px",
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-sans text-vintage-ink truncate" style={{ fontWeight: 500 }}>
            {eintrag.titel}
          </p>
          {eintrag.cents != null && eintrag.cents > 0 && (
            <span
              className="text-xs font-serif shrink-0"
              style={{ color: "var(--color-ink-mute)" }}
            >
              {formatPreis(eintrag.cents / 100)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[10px] font-mono"
            style={{ color: "var(--color-ink-mute)" }}
          >
            {zeit}
          </span>
          {eintrag.detail && (
            <>
              <span className="text-[10px] opacity-40">·</span>
              <span className="text-xs text-vintage-dust truncate">{eintrag.detail}</span>
            </>
          )}
        </div>
      </div>
    </li>
  );

  return eintrag.href
    ? <Link href={eintrag.href} className="block hover:bg-vintage-parchment/30 -mx-2 px-2 py-1 transition-colors" style={{ borderRadius: "var(--radius-vintage)" }}>{inner}</Link>
    : inner;
}

function formatRelativ(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const stunde = 60 * minute;

  if (diffMs < minute)         return "только что";
  if (diffMs < 60 * minute)    return `${Math.floor(diffMs / minute)} мин назад`;
  if (diffMs < 24 * stunde)    return `${Math.floor(diffMs / stunde)} ч назад`;
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
