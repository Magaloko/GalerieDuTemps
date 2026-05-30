"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPreis } from "@/lib/utils/preis";
import {
  produktQuickToggleAction,
  produktReservierenAction,
  produktReservierungAufhebenAction,
} from "@/app/(admin)/admin/produkte/actions";
import { useToast } from "@/components/ui/toast-provider";
import { Eye, EyeOff, Star, BadgeCheck, Clock, ChevronRight } from "lucide-react";
import type { ProduktListItem } from "@/types/produkt";

/* QuickToggleRow — kompakte Produktzeile mit Inline-Schnellaktionen als Icon-
 * Cluster (optimistische Updates via useTransition, Revert + Toast bei Fehler).
 * Auf dem A1-Daten-Kit; Status nur als ruhiger Chip wenn auffällig
 * (Продан/Резерв/Скрыт). Rendert die komplette <tr>. */
export function QuickToggleRow({
  produkt, base,
}: {
  produkt: ProduktListItem;
  base: string;
}) {
  const [p, setP] = useState(produkt);
  const [pending, start] = useTransition();
  const toast = useToast();

  // Optimistisches Toggle: lokalen Wert sofort kippen, bei Fehler zurück.
  const toggle = (feld: "aktiv" | "featured" | "verkauft") => {
    const next = !p[feld];
    setP(prev => ({ ...prev, [feld]: next }));
    start(async () => {
      const r = await produktQuickToggleAction(p.id, feld, next);
      if (!r.ok) {
        setP(prev => ({ ...prev, [feld]: !next }));
        toast.error(r.error ?? "Ошибка");
      }
    });
  };

  const toggleReservierung = () => {
    const willReserve = !p.reserviert;
    setP(prev => ({ ...prev, reserviert: willReserve }));
    start(async () => {
      const r = willReserve
        ? await produktReservierenAction(p.id, 48)
        : await produktReservierungAufhebenAction(p.id);
      if (!r.ok) {
        setP(prev => ({ ...prev, reserviert: !willReserve }));
        toast.error(r.error ?? "Ошибка");
      }
    });
  };

  // Statushinweis nur, wenn der Zustand vom Normalfall abweicht.
  const statusChip =
    p.verkauft   ? { klasse: "chip chip-danger",  label: "Продан" } :
    p.reserviert ? { klasse: "chip chip-coral",   label: "Резерв" } :
    !p.aktiv     ? { klasse: "chip chip-muted",   label: "Скрыт"  } :
    null;

  const ink     = "var(--color-ink-mute)";
  const forest  = "var(--color-vintage-forest)";
  const coral   = "var(--color-coral)";
  const burgund = "var(--color-vintage-burgundy)";

  return (
    <tr style={{ opacity: pending ? 0.55 : 1 }}>
      {/* Produkt (Bild + Name + Slug + Status-Chip) */}
      <td>
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 overflow-hidden flex-shrink-0"
               style={{ background: "var(--color-paper-warm)", borderRadius: "var(--radius-vintage)" }}>
            {p.hauptbild_url ? (
              <Image src={p.hauptbild_url} alt={p.name} fill sizes="40px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: ink }}>✦</div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link href={`${base}/produkte/${p.id}`} className="strong truncate" style={{ maxWidth: "16rem" }}>
                {p.name}
              </Link>
              {statusChip && <span className={statusChip.klasse}>{statusChip.label}</span>}
            </div>
            <p className="mono truncate" style={{ maxWidth: "16rem" }}>{p.slug}</p>
          </div>
        </div>
      </td>

      {/* Artikel-Code — ab md */}
      <td className="mono hidden md:table-cell">{p.artikel_code ?? "–"}</td>

      {/* Kategorie — ab lg */}
      <td className="muted hidden lg:table-cell">{p.kategorie_name ?? "–"}</td>

      {/* Preis */}
      <td className="num strong">{formatPreis(p.preis)}</td>

      {/* Schnell-Aktionen: kompakter Icon-Cluster */}
      <td className="num">
        <div className="flex items-center justify-end gap-0.5">
          <button
            onClick={() => toggle("aktiv")}
            disabled={pending}
            title={p.aktiv ? "Активен — скрыть" : "Скрыт — показать"}
            aria-label="Видимость"
            className="row-action"
            style={{ color: p.aktiv ? forest : ink }}
          >
            {p.aktiv ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => toggle("featured")}
            disabled={pending}
            title={p.featured ? "Убрать из топа" : "В топ"}
            aria-label="Топ"
            className="row-action"
            style={{ color: p.featured ? coral : ink }}
          >
            <Star className="w-4 h-4" fill={p.featured ? "currentColor" : "none"} />
          </button>

          <button
            onClick={() => toggle("verkauft")}
            disabled={pending}
            title={p.verkauft ? "Снова в продажу" : "Отметить проданным"}
            aria-label="Продан"
            className="row-action"
            style={{ color: p.verkauft ? burgund : ink }}
          >
            <BadgeCheck className="w-4 h-4" />
          </button>

          <button
            onClick={toggleReservierung}
            disabled={pending || p.verkauft}
            title={p.reserviert ? "Снять резерв" : "Зарезервировать на 48 ч"}
            aria-label="Резерв"
            className="row-action"
            style={{ color: p.reserviert ? coral : ink }}
          >
            <Clock className="w-4 h-4" />
          </button>

          <Link href={`${base}/produkte/${p.id}`} className="row-action" title="Открыть" aria-label="Открыть">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
