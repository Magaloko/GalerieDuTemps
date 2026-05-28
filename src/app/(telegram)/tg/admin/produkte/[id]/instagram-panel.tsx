"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Film, Image as ImageIcon, Tv, Link2, Link2Off, Loader2 } from "lucide-react";
import { instagramPostUpdateAction } from "../../actions";
import { haptic } from "../../../fx";

type Post = {
  id:             string;
  shortcode:      string;
  typ:            string;
  titel:          string | null;
  kategorie_name: string | null;
  produkt_id:     string | null;
};

const TYP_ICON: Record<string, React.ElementType> = {
  reel: Film, tv: Tv, p: ImageIcon,
};
const TYP_LABEL: Record<string, string> = { reel: "Reel", tv: "IGTV", p: "Post" };

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktInstagramPanel — verknüpfte Instagram-Posts verwalten.
 *
 * Wird in der Produktbearbeitungsseite unterhalb des ProduktEditors gerendert.
 * Lädt keine eigenen Daten (Server liefert alle Posts) — nur Actions.
 *
 * Logik:
 *  - linked  = alle Posts deren produkt_id === produktId
 *  - unlinked = alle anderen Posts (können hier verknüpft werden)
 * ────────────────────────────────────────────────────────────────────────── */
export function ProduktInstagramPanel({
  produktId,
  allePosts,
}: {
  produktId: string;
  allePosts: Post[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [selId, setSelId] = useState("");

  const linked   = allePosts.filter(p => p.produkt_id === produktId);
  const unlinked = allePosts.filter(p => p.produkt_id !== produktId);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { haptic("success"); setFlash({ ok: true, text: msg }); router.refresh(); }
      else      { haptic("error");   setFlash({ ok: false, text: r.error ?? "Ошибка" }); }
      setTimeout(() => setFlash(null), 2200);
    });

  const unlink = (postId: string) =>
    run(() => instagramPostUpdateAction(postId, { produktId: null }), "Отвязано");

  const link = () => {
    if (!selId) return;
    run(() => instagramPostUpdateAction(selId, { produktId }), "Привязано");
    setSelId("");
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bone)",
    border: "1px solid var(--color-line)",
    color: "var(--tg-theme-text-color, var(--color-ink))",
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4" style={{ color: "var(--color-coral)" }} />
        <h2 className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          Instagram-посты
        </h2>
      </div>

      {/* Verknüpfte Posts */}
      {linked.length === 0 ? (
        <p className="text-[12px] py-2 px-3"
          style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))", background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
          Нет связанных постов
        </p>
      ) : (
        <div className="space-y-1.5">
          {linked.map(p => {
            const Icon = TYP_ICON[p.typ] ?? ImageIcon;
            return (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2"
                style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-coral)" }} />
                <span className="text-[9px] uppercase px-1 py-0.5 shrink-0"
                  style={{ letterSpacing: "0.16em", background: "var(--color-bone)", color: "var(--color-ink-mute)" }}>
                  {TYP_LABEL[p.typ] ?? p.typ}
                </span>
                <span className="flex-1 text-sm truncate"
                  style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
                  {p.titel || p.shortcode}
                  {p.kategorie_name && (
                    <span className="ml-1.5 text-[10px]"
                      style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                      · {p.kategorie_name}
                    </span>
                  )}
                </span>
                <button type="button" disabled={pending} onClick={() => unlink(p.id)}
                  title="Отвязать"
                  className="shrink-0 p-1 disabled:opacity-40"
                  style={{ color: "var(--color-coral-deep, #A53E26)" }}>
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Neuen Post verknüpfen */}
      {unlinked.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selId}
            onChange={e => setSelId(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs"
            style={inputStyle}
          >
            <option value="">— выбрать пост —</option>
            {unlinked.map(p => (
              <option key={p.id} value={p.id}>
                {TYP_LABEL[p.typ] ?? p.typ}
                {p.kategorie_name ? ` · ${p.kategorie_name}` : ""}
                {" · "}
                {p.titel || p.shortcode}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selId || pending}
            onClick={link}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase font-medium disabled:opacity-40"
            style={{
              letterSpacing: "0.14em",
              background: "rgba(58,110,165,0.08)",
              border: "1px solid rgba(58,110,165,0.30)",
              color: "var(--color-indigo, #3A6EA5)",
            }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Привязать
          </button>
        </div>
      )}

      {flash && (
        <p className="text-[11px] px-1"
          style={{ color: flash.ok ? "var(--color-sage, #4a6b4a)" : "var(--color-coral-deep, #A53E26)" }}>
          {flash.text}
        </p>
      )}
    </div>
  );
}
