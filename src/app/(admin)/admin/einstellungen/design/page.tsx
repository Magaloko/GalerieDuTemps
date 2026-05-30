import { getModuleBase } from "@/lib/module-base-server";
import { getAllThemeSettings } from "@/lib/db/theme";
import { DesignCustomizer } from "./client";
import Link from "next/link";
import { ChevronLeft, Palette } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Дизайн сайта",
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin → Einstellungen → Дизайн сайта
 *
 * Editor mit Color-Pickern für alle 14 Brand-Farben, Logo-URL, Favicon,
 * Brand-Name + Tagline. Daneben Iframe-Live-Preview die nach jeder
 * Speicherung neu lädt.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function DesignPage() {
  const base = await getModuleBase();
  const settings = await getAllThemeSettings();

  return (
    <div className="max-w-[1600px] -mx-4 md:-mx-8 px-4 md:px-8 space-y-6">

      <nav
        className="text-[11px] uppercase font-medium flex items-center gap-2"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
      >
        <Link href={`${base}/einstellungen`} className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Настройки
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Дизайн сайта</span>
      </nav>

      <header>
        <p
          className="text-[11px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Внешний вид
        </p>
        <h1
          className="flex items-center gap-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          <Palette className="w-6 h-6" style={{ color: "var(--color-coral)" }} />
          Дизайн сайта
        </h1>
        <p
          className="mt-2 text-sm max-w-2xl"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          Цвета, логотип, фавикон, название бренда. Изменения видны мгновенно в превью справа,
          после «Сохранить» применяются на весь сайт.
        </p>
      </header>

      <DesignCustomizer settings={settings} />
    </div>
  );
}
