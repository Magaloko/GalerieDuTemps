"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Eye, EyeOff, ExternalLink, Send, CheckCheck } from "lucide-react";
import { instagramPostUpdateAction, instagramPostDeleteAction, instagramPostInKanalTgAction } from "../actions";
import { haptic } from "../../fx";

type Option = { value: string; label: string };

interface Props {
  id:                string;
  permalink:         string;
  shortcode:         string;
  typ:               string;
  aktiv:             boolean;
  kategorieId:       number | null;
  produktId:         string | null;
  brandId:           string | null;
  titel:             string | null;
  kanalGepostetAm:   string | null;
  kategorien:        Option[];
  produkte:          Option[];
  brands:            Option[];
}

/* Eine Archiv-Zeile: Embed-Permalink + Kategorie/Produkt umhängen, aktiv-Toggle, в канал, löschen. */
export function InstagramRow(p: Props) {
  const router = useRouter();
  const [pending, start]  = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, isKanal = false) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        haptic("success");
        if (isKanal) {
          setFlashOk(true);
          setFlash(r.message ?? "Опубликовано");
          setTimeout(() => setFlash(null), 3000);
        }
        router.refresh();
      } else {
        haptic("error");
        setFlashOk(false);
        setFlash(r.error ?? "Ошибка");
        setTimeout(() => setFlash(null), 2500);
      }
    });

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bone)", border: "1px solid var(--color-line)",
    color: "var(--tg-theme-text-color, var(--color-ink))",
  };

  // Format the broadcast date compactly if present
  const kanalLabel = p.kanalGepostetAm
    ? new Date(p.kanalGepostetAm).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="p-3 space-y-2" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", opacity: p.aktiv ? 1 : 0.6 }}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase px-1.5 py-0.5 shrink-0" style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink-mute)" }}>
          {p.typ}
        </span>
        <span className="text-sm font-mono truncate flex-1" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          {p.titel || p.shortcode}
        </span>
        {kanalLabel && (
          <span className="shrink-0 flex items-center gap-0.5 text-[10px]" style={{ color: "var(--color-sage, #6b7c6b)" }}>
            <CheckCheck className="w-3 h-3" />
            {kanalLabel}
          </span>
        )}
        <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="shrink-0" style={{ color: "var(--color-coral)" }}>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="flex gap-2">
        <select
          value={p.kategorieId ? String(p.kategorieId) : ""}
          onChange={e => run(() => instagramPostUpdateAction(p.id, { kategorieId: e.target.value ? parseInt(e.target.value, 10) : null }))}
          className="flex-1 px-2 py-1.5 text-xs" style={inputStyle}
        >
          <option value="">— категория —</option>
          {p.kategorien.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <select
          value={p.produktId ?? ""}
          onChange={e => run(() => instagramPostUpdateAction(p.id, { produktId: e.target.value || null }))}
          className="flex-1 px-2 py-1.5 text-xs" style={inputStyle}
        >
          <option value="">— товар —</option>
          {p.produkte.map(pr => <option key={pr.value} value={pr.value}>{pr.label}</option>)}
        </select>
      </div>

      <select
        value={p.brandId ?? ""}
        onChange={e => run(() => instagramPostUpdateAction(p.id, { brandId: e.target.value || null }))}
        className="w-full px-2 py-1.5 text-xs" style={inputStyle}
      >
        <option value="">— бренд —</option>
        {p.brands.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>

      <div className="flex gap-2">
        {/* Aktiv-Toggle */}
        <button type="button" disabled={pending}
          onClick={() => run(() => instagramPostUpdateAction(p.id, { aktiv: !p.aktiv }))}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] uppercase font-medium disabled:opacity-40"
          style={{ letterSpacing: "0.14em", ...inputStyle }}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.aktiv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {p.aktiv ? "Скрыть" : "Показать"}
        </button>

        {/* В канал */}
        <button type="button" disabled={pending}
          onClick={() => run(() => instagramPostInKanalTgAction(p.id), true)}
          title={p.kanalGepostetAm ? `Уже в канале: ${new Date(p.kanalGepostetAm).toLocaleString("ru-RU")}` : "Поделиться в Telegram-канале"}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase font-medium disabled:opacity-40"
          style={{
            letterSpacing: "0.14em",
            background: p.kanalGepostetAm ? "rgba(107,124,107,0.12)" : "rgba(58,110,165,0.08)",
            border:     p.kanalGepostetAm ? "1px solid rgba(107,124,107,0.40)" : "1px solid rgba(58,110,165,0.30)",
            color:      p.kanalGepostetAm ? "var(--color-sage, #4a6b4a)" : "var(--color-indigo, #3A6EA5)",
          }}>
          <Send className="w-3.5 h-3.5" />
          В канал
        </button>

        {/* Löschen */}
        <button type="button" disabled={pending}
          onClick={() => { if (confirm("Удалить из архива?")) run(() => instagramPostDeleteAction(p.id)); }}
          className="px-3 py-1.5 disabled:opacity-40"
          style={{ background: "rgba(165,62,38,0.08)", border: "1px solid rgba(165,62,38,0.30)", color: "var(--color-coral-deep, #A53E26)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {flash && (
        <p className="text-[11px]" style={{ color: flashOk ? "var(--color-sage, #4a6b4a)" : "var(--color-coral-deep, #A53E26)" }}>
          {flash}
        </p>
      )}
    </div>
  );
}
