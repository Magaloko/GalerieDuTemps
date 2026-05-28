"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, RotateCw, X, Loader2, Check } from "lucide-react";
import { formatPreis } from "@/lib/utils/preis";
import { produktReservierungTgAction, produktReservierungVerlaengernTgAction } from "../actions";
import { haptic } from "../../fx";

interface Props {
  id:            string;
  name:          string;
  slug:          string;
  preis:         number;
  waehrung:      string;
  bildUrl:       string | null;
  reserviertVon: string | null;
  stundenRest:   number;
}

/* Eine Reservierungs-Zeile: Reststunden-Badge + „Продлить 48ч" / „Снять резерв". */
export function ReservierungRow(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  const verlaengern = () => {
    start(async () => {
      const r = await produktReservierungVerlaengernTgAction(p.id);
      if (r.ok) { haptic("success"); setFlash("✓"); setTimeout(() => setFlash(null), 1500); router.refresh(); }
      else { haptic("error"); setFlash(r.error); setTimeout(() => setFlash(null), 2500); }
    });
  };

  const aufheben = () => {
    start(async () => {
      const r = await produktReservierungTgAction(p.id, false);
      if (r.ok) { haptic("success"); router.refresh(); }
      else { haptic("error"); setFlash(r.error); setTimeout(() => setFlash(null), 2500); }
    });
  };

  // Dringlichkeit nach Reststunden einfärben.
  const dringend = p.stundenRest <= 6;
  const restText = p.stundenRest <= 1 ? "< 1 ч" : `~${p.stundenRest} ч`;

  return (
    <div style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <div className="flex items-center gap-3 p-3">
        <Link
          href={`/tg/produkt/${p.slug}`}
          className="w-11 h-11 shrink-0 overflow-hidden"
          style={{ background: "var(--color-bone)", touchAction: "manipulation" }}
        >
          {p.bildUrl && /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.bildUrl} alt="" className="w-full h-full object-cover" />}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/tg/produkt/${p.slug}`}
            className="text-sm truncate block"
            style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
          >
            {p.name}
          </Link>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            {formatPreis(p.preis, (p.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT")}
            {p.reserviertVon ? ` · ${p.reserviertVon}` : ""}
          </p>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-medium"
          style={{
            letterSpacing: "0.1em",
            background:    dringend ? "rgba(232,112,58,0.12)" : "rgba(201,168,76,0.16)",
            color:         dringend ? "var(--color-coral)" : "#9A7B1F",
            border:        `1px solid ${dringend ? "rgba(232,112,58,0.45)" : "rgba(201,168,76,0.5)"}`,
          }}
        >
          <Clock className="w-3 h-3" /> {restText}
        </span>
      </div>

      <div className="flex gap-2 px-3 pb-3">
        <button
          type="button"
          disabled={pending}
          onClick={verlaengern}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium disabled:opacity-40"
          style={{ letterSpacing: "0.14em", background: "rgba(201,168,76,0.14)", color: "#9A7B1F", border: "1px solid rgba(201,168,76,0.55)" }}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
          Продлить 48ч
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={aufheben}
          className="flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] uppercase font-medium disabled:opacity-40"
          style={{ letterSpacing: "0.14em", background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}
        >
          <X className="w-3.5 h-3.5" /> Снять
        </button>
      </div>

      {flash && flash !== "✓" && (
        <p className="px-3 pb-2 text-[11px]" style={{ color: "var(--color-coral-deep, #A53E26)" }}>{flash}</p>
      )}
      {flash === "✓" && (
        <p className="px-3 pb-2 text-[11px] flex items-center gap-1" style={{ color: "#52663F" }}>
          <Check className="w-3 h-3" /> Продлено
        </p>
      )}
    </div>
  );
}
