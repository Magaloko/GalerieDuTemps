"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Eye, EyeOff, Tag, Pencil, Clock, Megaphone } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { produktSchnellEditAction, produktReservierungTgAction, produktInKanalTgAction } from "../actions";
import { haptic } from "../../fx";

interface Props {
  id:           string;
  name:         string;
  artikelCode:  string | null;
  preis:        number;
  aktiv:        boolean;
  lagerbestand: number;
  bildUrl:      string | null;
  verkauft:     boolean;
  reserviert:   boolean;
}

/* Eine Produkt-Zeile mit aufklappbaren Quick-Actions: Preis setzen, Publish/Hide. */
export function ProduktRow(p: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [preis, setPreis]     = useState(p.preis > 1 ? String(p.preis) : "");
  const [pending, start]      = useTransition();
  const [flash, setFlash]     = useState<string | null>(null);

  const ohnePreis = p.preis <= 1;

  const run = (opts: Parameters<typeof produktSchnellEditAction>[0]) => {
    start(async () => {
      const r = await produktSchnellEditAction(opts);
      if (r.ok) { haptic("success"); setFlash("✓"); setTimeout(() => setFlash(null), 1500); router.refresh(); }
      else { haptic("error"); setFlash(r.error); setTimeout(() => setFlash(null), 2500); }
    });
  };

  const runReserve = (reservieren: boolean) => {
    start(async () => {
      const r = await produktReservierungTgAction(p.id, reservieren);
      if (r.ok) { haptic("success"); setFlash("✓"); setTimeout(() => setFlash(null), 1500); router.refresh(); }
      else { haptic("error"); setFlash(r.error); setTimeout(() => setFlash(null), 2500); }
    });
  };

  const runBroadcast = () => {
    start(async () => {
      const r = await produktInKanalTgAction(p.id);
      if (r.ok) { haptic("success"); setFlash("✓"); setTimeout(() => setFlash(null), 2000); }
      else { haptic("error"); setFlash(r.error); setTimeout(() => setFlash(null), 2800); }
    });
  };

  return (
    <div style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-3 text-left"
        style={{ touchAction: "manipulation" }}
      >
        <div className="w-11 h-11 shrink-0 overflow-hidden" style={{ background: "var(--color-bone)" }}>
          {p.bildUrl && /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.bildUrl} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm truncate" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              {p.name}
            </p>
            {p.verkauft
              ? <span className="text-[9px] uppercase px-1 py-0.5 shrink-0" style={{ background: "#8884", color: "var(--color-ink-mute)" }}>продан</span>
              : p.aktiv
                ? <span className="text-[9px] uppercase px-1 py-0.5 shrink-0" style={{ background: "rgba(127,140,90,0.15)", color: "#52663F" }}>🟢</span>
                : <span className="text-[9px] uppercase px-1 py-0.5 shrink-0" style={{ background: "rgba(232,112,58,0.12)", color: "var(--color-coral)" }}>черновик</span>}
            {p.reserviert && !p.verkauft && (
              <span className="text-[9px] uppercase px-1 py-0.5 shrink-0" style={{ background: "rgba(201,168,76,0.18)", color: "#9A7B1F" }}>⏳ бронь</span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            <span className="font-mono">{p.artikelCode ?? "—"}</span>
            {" · "}
            {ohnePreis ? <span style={{ color: "var(--color-coral)" }}>без цены</span> : formatPreis(p.preis)}
            {" · "}ост. {p.lagerbestand}
          </p>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2" style={{ borderTop: "1px dashed var(--color-line)" }}>
          {/* Preis */}
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
            <input
              type="number"
              inputMode="numeric"
              value={preis}
              onChange={e => setPreis(e.target.value)}
              placeholder="Цена ₸"
              className="flex-1 px-2 py-1.5 text-sm"
              style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
            />
            <button
              type="button"
              disabled={pending || !preis}
              onClick={() => run({ produktId: p.id, preis: parseInt(preis, 10) })}
              className="px-3 py-1.5 text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.16em", background: "var(--color-ink)", color: "#fff" }}
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "OK"}
            </button>
          </div>
          {/* Publish / Hide */}
          <div className="flex gap-2">
            {!p.aktiv ? (
              <button
                type="button"
                disabled={pending || ohnePreis}
                onClick={() => run({ produktId: p.id, publish: true })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
                style={{ letterSpacing: "0.16em", background: "var(--color-coral)", color: "#fff" }}
              >
                <Eye className="w-3.5 h-3.5" /> Опубликовать
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ produktId: p.id, hide: true })}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}
              >
                <EyeOff className="w-3.5 h-3.5" /> Скрыть
              </button>
            )}
          </div>
          {/* Reservierung (nur wenn nicht verkauft) */}
          {!p.verkauft && (
            p.reserviert ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => runReserve(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium"
                style={{ letterSpacing: "0.16em", background: "rgba(201,168,76,0.14)", color: "#9A7B1F", border: "1px solid rgba(201,168,76,0.55)" }}
              >
                <Clock className="w-3.5 h-3.5" /> Снять резерв
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => runReserve(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
                style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}
              >
                <Clock className="w-3.5 h-3.5" /> Зарезервировать 48ч
              </button>
            )
          )}

          {/* New-Arrivals-Broadcast in den Kanal — nur wenn aktiv & nicht verkauft */}
          {p.aktiv && !p.verkauft && (
            <button
              type="button"
              disabled={pending}
              onClick={runBroadcast}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
              style={{ letterSpacing: "0.16em", background: "rgba(38,163,238,0.12)", color: "#1E6FA8", border: "1px solid rgba(38,163,238,0.40)" }}
            >
              <Megaphone className="w-3.5 h-3.5" /> В канал (новинка)
            </button>
          )}

          {/* Voll-Editor öffnen */}
          <Link
            href={`/tg/admin/produkte/${p.id}`}
            className="flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink)", border: "1px solid var(--color-line)" }}
          >
            <Pencil className="w-3.5 h-3.5" /> Полный редактор (фото, поля)
          </Link>
          {ohnePreis && !p.aktiv && (
            <p className="text-[10px]" style={{ color: "var(--color-coral)", fontStyle: "italic" }}>
              Укажите цену, чтобы опубликовать.
            </p>
          )}
          {flash && (
            <p className="text-[11px] flex items-center gap-1" style={{ color: flash === "✓" ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
              {flash === "✓" ? <><Check className="w-3 h-3" /> Сохранено</> : flash}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
