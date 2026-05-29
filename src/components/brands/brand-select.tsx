"use client";

import type { BrandOption } from "@/types/brand";

/* ──────────────────────────────────────────────────────────────────────────
 * BrandSelect — wiederverwendbares Marken-Dropdown (Client).
 *
 * Die aktiven Marken kommen als Prop (vom Server-Parent geladen via
 * brandsAktiv()). Erster Eintrag „— Без бренда —" (value="") koppelt die
 * Entität ab. Markenkonform eckig. Wird von Journal-Editor / Landing-Editor /
 * Instagram-Admin genutzt (kontrollierter Wert + onChange). Für das native
 * Produkt-Formular gibt es zusätzlich ein `name`-Prop, sodass es per FormData
 * mitgesendet wird.
 * ────────────────────────────────────────────────────────────────────────── */

export function BrandSelect({
  brands,
  value,
  onChange,
  name,
  label = "Бренд",
  className,
}: {
  brands: BrandOption[];
  value: string;
  onChange?: (v: string) => void;
  name?: string;
  label?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[10px] uppercase tracking-widest text-vintage-dust">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink"
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <option value="">— Без бренда —</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </label>
  );
}
