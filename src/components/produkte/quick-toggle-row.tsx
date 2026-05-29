"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, EyeOff, Star, Loader2, Clock, Megaphone, BellRing } from "lucide-react";
import {
  produktQuickToggleAction,
  produktReservierenAction,
  produktReservierungAufhebenAction,
  produktInKanalAction,
  produktKundenPushAction,
} from "@/app/(admin)/admin/produkte/actions";
import { useToast } from "@/components/ui/toast-provider";

interface Props {
  id:           string;
  aktiv:        boolean;
  featured:     boolean;
  verkauft:     boolean;
  lagerbestand: number;
  reserviert?:  boolean;
}

/**
 * Drei Inline-Toggles für die Listen-Tabelle:
 *  - Featured  (Stern)
 *  - Aktiv     (Status-Pill: Активен / Неактивен / Продано / Нет в наличии)
 * Klick = sofortige Mutation via Server Action, mit optimistic UI.
 */
export function QuickToggleRow({ id, aktiv, featured, verkauft, lagerbestand, reserviert = false }: Props) {
  const [optimistic, setOptimistic] = useState({ aktiv, featured, verkauft });
  const [reserviertState, setReserviert] = useState(reserviert);
  const [pending, start] = useTransition();
  const toast = useToast();

  const toggle = (feld: "aktiv" | "featured" | "verkauft") => {
    const next = !optimistic[feld];
    setOptimistic(o => ({ ...o, [feld]: next }));
    start(async () => {
      const r = await produktQuickToggleAction(id, feld, next);
      if (!r.ok) {
        // Revert bei Fehler
        setOptimistic(o => ({ ...o, [feld]: !next }));
        toast.error(r.error ?? "Ошибка");
      }
    });
  };

  const toggleReservierung = () => {
    const willReserve = !reserviertState;
    setReserviert(willReserve);
    start(async () => {
      const r = willReserve
        ? await produktReservierenAction(id, 48)
        : await produktReservierungAufhebenAction(id);
      if (!r.ok) {
        setReserviert(!willReserve);   // revert
        toast.error(r.error ?? "Ошибка");
      }
    });
  };

  const broadcast = () => {
    if (!confirm("Опубликовать этот товар в Telegram-канал как новинку?")) return;
    start(async () => {
      const r = await produktInKanalAction(id);
      if (r.ok) toast.success("Опубликовано в канал ✓");
      else toast.error(r.error ?? "Ошибка");
    });
  };

  const kundenPush = () => {
    if (!confirm("Отправить push-уведомление всем подписчикам о новинке?")) return;
    start(async () => {
      const r = await produktKundenPushAction(id);
      if ("ok" in r) toast.success("Уведомление отправлено ✓");
      else toast.error(r.error ?? "Ошибка");
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

      {/* Reservierung — nur sinnvoll wenn nicht verkauft */}
      {!optimistic.verkauft && (
        <button
          type="button"
          onClick={toggleReservierung}
          disabled={pending}
          title={reserviertState ? "Снять резерв" : "Зарезервировать на 48 часов"}
          className={`flex items-center gap-1 px-2 py-1 border text-xs transition-colors ${
            reserviertState
              ? "border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/10"
              : "border-vintage-sand text-vintage-dust hover:bg-vintage-parchment"
          }`}
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Clock className="w-3 h-3" />
          {reserviertState ? "Зарезервировано ↺" : "Резерв 48ч"}
        </button>
      )}

      {/* New-Arrivals-Broadcast in den Telegram-Kanal */}
      {optimistic.aktiv && !optimistic.verkauft && (
        <button
          type="button"
          onClick={broadcast}
          disabled={pending}
          title="Опубликовать в Telegram-канал как новинку"
          className="flex items-center gap-1 px-2 py-1 border border-vintage-sand text-xs text-vintage-dust hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <Megaphone className="w-3 h-3" />
          В канал
        </button>
      )}

      {/* Web-Push an Kunden-Abonnenten (Neuheit) */}
      {optimistic.aktiv && !optimistic.verkauft && (
        <button
          type="button"
          onClick={kundenPush}
          disabled={pending}
          title="📣 Уведомить подписчиков о новинке (web-push)"
          className="flex items-center gap-1 px-2 py-1 border border-vintage-sand text-xs text-vintage-dust hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <BellRing className="w-3 h-3" />
          Подписчикам
        </button>
      )}
    </div>
  );
}
