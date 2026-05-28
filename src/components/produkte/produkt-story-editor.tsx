"use client";

import { useState } from "react";
import {
  Heading2, Type, Image as ImageIcon, Lightbulb, Quote,
  ArrowUp, ArrowDown, Copy, Trash2, Eye, Pencil, Plus,
} from "lucide-react";
import type { ProduktBlock, ProduktBlockTyp } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktStoryEditor — block-basierter Editor für die Produktbeschreibung.
 *
 * Inspiriert vom Newsletter-Editor: Palette zum Hinzufügen, Block-Liste mit
 * Inline-Bearbeitung + Controls (hoch/runter/duplizieren/löschen) und ein
 * Vorschau-Umschalter. Serialisiert nach JSON in ein Hidden-Input (FormData).
 *
 * Hinweis (MVP): Story-Blöcke sind einsprachig (Primär-Sprache). Die kurzen/
 * SEO-Felder bleiben mehrsprachig.
 * ────────────────────────────────────────────────────────────────────────── */

const PALETTE: { type: ProduktBlockTyp; label: string; icon: React.ElementType; sub: string }[] = [
  { type: "heading",   label: "Подзаголовок", icon: Heading2,  sub: "H2" },
  { type: "text",      label: "Текст",        icon: Type,      sub: "Абзац" },
  { type: "image",     label: "Изображение",  icon: ImageIcon, sub: "Фото + подпись" },
  { type: "highlight", label: "Подсказка",    icon: Lightbulb, sub: "Выделенный блок" },
  { type: "quote",     label: "Цитата",       icon: Quote,     sub: "С автором" },
];

const NEU: Record<ProduktBlockTyp, ProduktBlock> = {
  heading:   { type: "heading",   text: "" },
  text:      { type: "text",      text: "" },
  image:     { type: "image",     bild_url: "", caption: "" },
  highlight: { type: "highlight", text: "" },
  quote:     { type: "quote",     text: "", caption: "" },
};

const inputCls = "w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";

export function ProduktStoryEditor({
  name = "inhalt_blocks",
  initial = [],
}: {
  name?:    string;
  initial?: ProduktBlock[];
}) {
  const [blocks, setBlocks] = useState<ProduktBlock[]>(initial);
  const [preview, setPreview] = useState(false);

  const add    = (t: ProduktBlockTyp) => setBlocks(b => [...b, { ...NEU[t] }]);
  const remove = (i: number) => setBlocks(b => b.filter((_, idx) => idx !== i));
  const dup    = (i: number) => setBlocks(b => [...b.slice(0, i + 1), { ...b[i] }, ...b.slice(i + 1)]);
  const patch  = (i: number, p: Partial<ProduktBlock>) =>
    setBlocks(b => b.map((blk, idx) => (idx === i ? { ...blk, ...p } : blk)));
  const move   = (i: number, d: number) => setBlocks(b => {
    const j = i + d;
    if (j < 0 || j >= b.length) return b;
    const arr = [...b];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  return (
    <div className="space-y-4">
      {/* Hidden-Input für FormData */}
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {/* Kopfzeile: Block-Anzahl + Vorschau-Umschalter */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans text-vintage-dust">{blocks.length} блок(ов)</span>
        <button
          type="button"
          onClick={() => setPreview(p => !p)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase font-medium border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment transition-colors"
          style={{ borderRadius: "var(--radius-vintage)", letterSpacing: "0.12em" }}
        >
          {preview ? <><Pencil className="w-3 h-3" /> Редактировать</> : <><Eye className="w-3 h-3" /> Просмотр</>}
        </button>
      </div>

      {/* Palette */}
      {!preview && (
        <div className="flex flex-wrap gap-2">
          {PALETTE.map(p => (
            <button
              key={p.type}
              type="button"
              onClick={() => add(p.type)}
              title={p.sub}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              <p.icon className="w-3.5 h-3.5 text-vintage-gold" /> {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Block-Liste */}
      {blocks.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-vintage-dust border border-dashed border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
          <Plus className="w-4 h-4" /> Добавьте блоки выше — текст, фото, цитату…
        </div>
      ) : preview ? (
        <StoryPreview blocks={blocks} />
      ) : (
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <div key={i} className="border border-vintage-sand bg-vintage-white p-3" style={{ borderRadius: "var(--radius-card)" }}>
              {/* Controls */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-vintage-gold/80">
                  {PALETTE.find(p => p.type === b.type)?.label ?? b.type}
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn title="Вверх"      onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn title="Вниз"       onClick={() => move(i, 1)}  disabled={i === blocks.length - 1}><ArrowDown className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn title="Дублировать" onClick={() => dup(i)}><Copy className="w-3.5 h-3.5" /></IconBtn>
                  <IconBtn title="Удалить"    onClick={() => remove(i)} danger><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                </div>
              </div>

              {/* Felder je Typ */}
              {b.type === "heading" && (
                <input className={inputCls} value={b.text ?? ""} placeholder="Подзаголовок" onChange={e => patch(i, { text: e.target.value })} />
              )}
              {(b.type === "text" || b.type === "highlight") && (
                <textarea className={inputCls} rows={b.type === "text" ? 5 : 3} value={b.text ?? ""} placeholder={b.type === "text" ? "Текст абзаца… (пустая строка = новый абзац)" : "Выделенная подсказка…"} onChange={e => patch(i, { text: e.target.value })} />
              )}
              {b.type === "quote" && (
                <div className="space-y-2">
                  <textarea className={inputCls} rows={2} value={b.text ?? ""} placeholder="Цитата…" onChange={e => patch(i, { text: e.target.value })} />
                  <input className={inputCls} value={b.caption ?? ""} placeholder="Автор / источник" onChange={e => patch(i, { caption: e.target.value })} />
                </div>
              )}
              {b.type === "image" && (
                <div className="space-y-2">
                  <input className={inputCls} value={b.bild_url ?? ""} placeholder="URL изображения (можно вставить из галереи выше)" onChange={e => patch(i, { bild_url: e.target.value })} />
                  <input className={inputCls} value={b.caption ?? ""} placeholder="Подпись (необязательно)" onChange={e => patch(i, { caption: e.target.value })} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.bild_url && <img src={b.bild_url} alt="" className="w-full max-h-48 object-cover" style={{ borderRadius: "var(--radius-vintage)" }} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, disabled, danger }: {
  children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 border border-vintage-sand transition-colors disabled:opacity-30 ${danger ? "text-vintage-burgundy hover:bg-vintage-burgundy/10" : "text-vintage-ink hover:bg-vintage-parchment"}`}
      style={{ borderRadius: "var(--radius-vintage)" }}
    >
      {children}
    </button>
  );
}

/** Leichte Client-Vorschau (markenkonform, ohne next/image). */
function StoryPreview({ blocks }: { blocks: ProduktBlock[] }) {
  return (
    <div className="space-y-5 p-4 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
      {blocks.map((b, i) => {
        if (b.type === "heading") return <h3 key={i} className="font-serif text-xl text-vintage-espresso">{b.text}</h3>;
        if (b.type === "text") return (
          <div key={i} className="space-y-2 text-sm text-vintage-ink" style={{ lineHeight: 1.7 }}>
            {(b.text ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)}
          </div>
        );
        if (b.type === "highlight") return <div key={i} className="p-3 text-sm text-vintage-ink" style={{ background: "rgba(201,168,76,0.10)", borderLeft: "3px solid var(--color-gold,#C9A84C)" }}>{b.text}</div>;
        if (b.type === "quote") return (
          <blockquote key={i} className="pl-3 italic text-vintage-ink" style={{ borderLeft: "2px solid var(--color-coral)" }}>
            “{b.text}”{b.caption && <cite className="block mt-1 not-italic text-xs text-vintage-dust">— {b.caption}</cite>}
          </blockquote>
        );
        if (b.type === "image" && b.bild_url) return (
          <figure key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.bild_url} alt={b.caption ?? ""} className="w-full object-cover" style={{ borderRadius: "var(--radius-vintage)" }} />
            {b.caption && <figcaption className="text-xs italic text-vintage-dust mt-1">{b.caption}</figcaption>}
          </figure>
        );
        return null;
      })}
    </div>
  );
}
