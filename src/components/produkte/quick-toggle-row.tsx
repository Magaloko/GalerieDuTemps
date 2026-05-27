"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, EyeOff, Star, Loader2 } from "lucide-react";
import { produktQuickToggleAction } from "@/app/(admin)/admin/produkte/actions";

interface Props {
  id:           string;
  aktiv:        boolean;
  featured:     boolean;
  verkauft:     boolean;
  lagerbestand: number;
}

/**
 * Drei Inline-Toggles für die Listen-Tabelle:
 *  - Featured  (Stern)
 *  - Aktiv     (Status-Pill: Активен / Неактивен / Продано / Нет в наличии)
 * Klick = sofortige Mutation via Server Action, mit optimistic UI.
 */
export function QuickToggleRow({ id, aktiv, featured, verkauft, lagerbestand }: Props) {
  const [optimistic, setOptimistic] = useState({ aktiv, featured, verkauft });
  const [pending, start] = useTransition();

  const toggle = (feld: "aktiv" | "featured" | "verkauft") => {
    const next = !optimistic[feld];
    setOptimistic(o => ({ ...o, [feld]: next }));
    start(async () => {
      const r = await produktQuickToggleAction(id, feld, next);
      if (!r.ok) {
        // Revert bei Fehler
        setOptimistic(o => ({ ...o, [feld]: !next }));
        alert(r.error ?? "Ошибка");
      }
    });
  };

  const statusBadge = (() => {
    if (pending) return { icon: Loader2, label: "…", cls: "text-vintage-dust animate-spin" };
    if (!optimistic.aktiv)             return { icon: EyeOff,      label: "Неактивен",      cls: "text-vintage-dust" };
    if (optimistic.verkauft)           return { icon: XCircle,     label: "Продано",         cls: "text-vintage-dust" };
    if (lagerbestand === 0)            return { icon: XCircle,     label: "Нет в наличии",   cls: "text-vintage-copper" };
    return                                       { icon: CheckCircle2, label: "Активен",     cls: "text-vintage-sage" };
  })();

  return (
    <div className="flex items-center justify-center gap-2">
      {/* Featured-Stern */}
      <button
        type="button"
        onClick={() => toggle("featured")}
        disabled={pending}
        title={optimistic.featured ? "Избранное (клик — снять)" : "Сделать избранным"}
        className={`p-1.5 transition-colors ${
          optimistic.featured ? "text-vintage-gold" : "text-vintage-sand hover:text-vintage-gold"
        }`}
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <Star className={`w-4 h-4 ${optimistic.featured ? "fill-current" : ""}`} />
      </button>

      {/* Aktiv/Inaktiv-Pill */}
      <button
        type="button"
        onClick={() => toggle("aktiv")}
        disabled={pending}
        title={optimistic.aktiv ? "Отключить" : "Включить"}
        className={`flex items-center gap-1 px-2 py-1 border border-vintage-sand text-xs hover:bg-vintage-parchment transition-colors ${statusBadge.cls}`}
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <statusBadge.icon className="w-3 h-3" />
        {statusBadge.label}
      </button>

      {/* Verkauft-Toggle (nur sichtbar wenn verkauft = visueller Hinweis) */}
      {optimistic.verkauft && (
        <button
          type="button"
          onClick={() => toggle("verkauft")}
          disabled={pending}
          title="Снять отметку «продано»"
          className="px-2 py-1 border border-vintage-burgundy/40 text-vintage-burgundy text-xs hover:bg-vintage-burgundy/10 transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          Продано ↺
        </button>
      )}
    </div>
  );
}
