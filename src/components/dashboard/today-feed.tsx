import Link from "next/link";
import {
  ShoppingBag, CreditCard, Truck, UserPlus, Mail, Package, Activity,
} from "lucide-react";
import { aktionsItems, aktivitaetsFeed } from "@/lib/db/dashboard-v2";
import type { AktivitaetsEintrag, AktivitaetsTyp } from "@/lib/db/dashboard-v2";
import { formatPreis } from "@/lib/utils/preis";

/* ──────────────────────────────────────────────────────────────────────────
 * TodayFeed — geteilte „Сегодня"-Dashboard-Sektion
 *
 * Server-Komponente: lädt selbst aktionsItems() + aktivitaetsFeed(24, 8).
 * Wird identisch in der Web-Operator-App (/app) und in der Telegram-
 * Mini-App-Admin (/tg/admin) eingesetzt.
 *
 * Styling: theme-adaptiv (Telegram-WebApp-Theme-Vars) mit Brand-Fallback.
 *   Keine Web-only-Deps (kein gsap/lenis), mobil-first, eckig.
 * ────────────────────────────────────────────────────────────────────────── */

const TG_SECTION = "var(--tg-theme-section-bg-color, #fff)";
const TG_TEXT    = "var(--tg-theme-text-color, var(--color-ink))";
const TG_HINT    = "var(--tg-theme-hint-color, var(--color-ink-mute))";
const CORAL      = "var(--color-coral)";

const URGENCY_DOT: Record<"info" | "warn" | "critical", string> = {
  critical: "var(--color-coral-deep)",
  warn:     "var(--color-coral)",
  info:     "var(--color-ink-mute)",
};

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
  order_paid:          "#7F8C5A",
  order_shipped:       "#52663F",
  customer_registered: "var(--color-cobalt, #1A2342)",
  kontakt_received:    "#C9A84C",
  lead_received:       "#C9A84C",
  product_added:       "var(--color-ink-mute)",
};

/** Relative Zeit auf Russisch: „только что" / „5 мин назад" / „2 ч назад". */
function relativeZeit(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const stunde = 60 * minute;

  if (diffMs < minute)      return "только что";
  if (diffMs < 60 * minute) return `${Math.floor(diffMs / minute)} мин назад`;
  if (diffMs < 24 * stunde) return `${Math.floor(diffMs / stunde)} ч назад`;
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export async function TodayFeed({
  aktivitaetStunden = 24,
}: {
  aktivitaetStunden?: number;
} = {}) {
  const [actions, activity] = await Promise.all([
    aktionsItems().catch(() => []),
    aktivitaetsFeed(aktivitaetStunden, 8).catch(() => []),
  ]);

  const eyebrow: React.CSSProperties = {
    letterSpacing: "0.24em",
    color: TG_HINT,
  };

  return (
    <div className="space-y-3">
      {/* ─── Что сделать сегодня ──────────────────────────────────── */}
      <section
        className="p-4"
        style={{ background: TG_SECTION, border: "1px solid var(--color-line)", borderRadius: 10 }}
      >
        <p className="text-[10px] uppercase font-medium mb-3" style={eyebrow}>
          Что сделать сегодня
        </p>

        {actions.length === 0 ? (
          <p className="text-[13px]" style={{ color: TG_HINT }}>
            Всё под контролем ✓
          </p>
        ) : (
          <ul className="space-y-0.5">
            {actions.map(item => (
              <li key={item.schluessel}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 py-2 -mx-2 px-2"
                  style={{ borderRadius: 4, touchAction: "manipulation" }}
                >
                  <span
                    className="shrink-0"
                    style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: URGENCY_DOT[item.urgency],
                    }}
                  />
                  <span className="flex-1 text-[13px] leading-snug" style={{ color: TG_TEXT }}>
                    {item.label}
                  </span>
                  <span
                    className="shrink-0 text-[11px] font-medium tabular-nums"
                    style={{ color: CORAL }}
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Активность ───────────────────────────────────────────── */}
      <section
        className="p-4"
        style={{ background: TG_SECTION, border: "1px solid var(--color-line)", borderRadius: 10 }}
      >
        <p className="flex items-center gap-1.5 text-[10px] uppercase font-medium mb-3" style={eyebrow}>
          <Activity className="w-3 h-3" style={{ color: CORAL }} />
          Активность
        </p>

        {activity.length === 0 ? (
          <p className="text-[13px]" style={{ color: TG_HINT }}>
            Пока тихо
          </p>
        ) : (
          <ol className="space-y-2.5">
            {activity.map((e, i) => (
              <FeedItem key={i} eintrag={e} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function FeedItem({ eintrag }: { eintrag: AktivitaetsEintrag }) {
  const Icon  = TYP_ICON[eintrag.typ] ?? Activity;
  const color = TYP_COLOR[eintrag.typ] ?? CORAL;

  const inner = (
    <li className="flex items-start gap-2.5">
      <span
        className="shrink-0 flex items-center justify-center mt-0.5"
        style={{
          width: 26, height: 26, borderRadius: 999,
          background: "rgba(15, 20, 48, 0.04)",
          border: `1px solid ${color}33`,
        }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[13px] leading-snug truncate" style={{ color: TG_TEXT, fontWeight: 500 }}>
            {eintrag.titel}
          </p>
          {eintrag.cents != null && eintrag.cents > 0 && (
            <span className="shrink-0 text-[11px] tabular-nums" style={{ color: TG_HINT }}>
              {formatPreis(eintrag.cents / 100)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px]" style={{ color: TG_HINT }}>
            {relativeZeit(eintrag.zeitstempel)}
          </span>
          {eintrag.detail && (
            <>
              <span className="text-[10px] opacity-40" style={{ color: TG_HINT }}>·</span>
              <span className="text-[11px] truncate" style={{ color: TG_HINT }}>
                {eintrag.detail}
              </span>
            </>
          )}
        </div>
      </div>
    </li>
  );

  return eintrag.href ? (
    <Link
      href={eintrag.href}
      className="block -mx-2 px-2 py-1"
      style={{ borderRadius: 6, touchAction: "manipulation" }}
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}
