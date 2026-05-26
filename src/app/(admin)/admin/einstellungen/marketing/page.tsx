import { getAllMarketingStrings } from "@/lib/db/marketing-strings";
import { MarketingTextsClient } from "./client";
import Link from "next/link";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Marketing-Texte" };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin → Einstellungen → Marketing-Texte
 *
 * Listet alle editierbaren Marketing-Strings auf (Hero, Ticker, Promo,
 * Newsletter). Jeder Eintrag hat 3 Sprach-Felder (RU/EN/DE).
 *
 * Die Server-Component lädt initial alle Strings, der Client kümmert sich
 * um Edit-Form + Save-Action. Cache wird beim Save invalidiert.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function MarketingTextsPage() {
  const strings = await getAllMarketingStrings();

  return (
    <div className="max-w-4xl space-y-6">

      <nav
        className="text-[11px] uppercase font-medium flex items-center gap-2"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
      >
        <Link href="/admin/einstellungen" className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Einstellungen
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Marketing-Texte</span>
      </nav>

      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          Content-Management
        </p>
        <h1
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          <MessageSquareText className="w-6 h-6" style={{ color: "var(--color-coral)" }} />
          Marketing-Texte
        </h1>
        <p
          className="mt-2 text-sm max-w-2xl"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          Hero-Headlines, Ticker, Promo-Bar und Newsletter-Texte — pro Sprache editierbar.
          Änderungen sind nach ~60 s live (Server-Cache TTL).
        </p>
      </header>

      <MarketingTextsClient strings={strings} />
    </div>
  );
}
