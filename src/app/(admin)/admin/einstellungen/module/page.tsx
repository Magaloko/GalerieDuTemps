import Link from "next/link";
import { ChevronLeft, ToggleLeft, Info } from "lucide-react";
import { getAllFeatures, FEATURE_FLAGS, ALL_FEATURE_KEYS } from "@/lib/db/feature-flags";
import { ModuleFormular } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Модули" };
export const dynamic    = "force-dynamic";
export const revalidate = 0;

/**
 * Admin > Einstellungen > Module
 *
 * Toggles für ein-/ausschaltbare Features (B2B, KI-Assistent, Wunschliste,
 * Kontaktformular, Auto-Translation). Module-Status wirkt sich sofort auf
 * die ganze Site aus — Route 404, UI-Element verschwindet.
 */
export default async function ModulePage() {
  const flags = await getAllFeatures();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/einstellungen"
          className="p-1.5 hover:bg-vintage-sand/40 transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
          aria-label="Назад"
        >
          <ChevronLeft className="w-4 h-4 text-vintage-dust" />
        </Link>
        <ToggleLeft className="w-5 h-5 text-vintage-gold" />
        <div>
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">Модули</h1>
          <p className="text-vintage-dust text-xs font-sans mt-0.5">
            Включить/выключить отдельные модули без перезапуска
          </p>
        </div>
      </div>

      {/* Info-Banner */}
      <div
        className="p-4 flex items-start gap-3"
        style={{
          background:   "rgba(201,168,76,0.08)",
          border:       "1px solid rgba(201,168,76,0.30)",
          borderLeft:   "4px solid var(--color-gold, #C9A84C)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-gold, #C9A84C)" }} />
        <div className="text-sm text-vintage-ink font-sans">
          <p>
            Изменения вступают в силу <strong>сразу</strong> после сохранения. Кешируется на 5 секунд,
            затем все страницы перечитают флаги.
          </p>
          <p className="mt-1 text-xs text-vintage-dust">
            Выключенный модуль: страницы возвращают 404, UI-элементы исчезают, API-эндпоинты возвращают 503.
          </p>
        </div>
      </div>

      <ModuleFormular initialFlags={flags} keys={ALL_FEATURE_KEYS} catalog={FEATURE_FLAGS} />
    </div>
  );
}
