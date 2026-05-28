"use client";

import { useState, useTransition } from "react";
import {
  Heading2, Type, Image as ImageIcon, Lightbulb, Quote,
  ArrowUp, ArrowDown, Copy, Trash2, X, Upload, LayoutPanelTop, Loader2,
  Minus, MousePointerClick, Columns2, LayoutGrid,
} from "lucide-react";
import { storyBildUploadAction } from "@/app/(admin)/admin/produkte/actions";
import type { ProduktBlock, ProduktBlockTyp, Produktbild } from "@/types/produkt";

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktStoryEditor — Voll-3-Pane Block-Editor für die Produkt-Story.
 *
 * Im Formular nur ein Hidden-Input + Button. Klick öffnet ein Vollbild-Overlay
 * im Newsletter-Editor-Stil:
 *   ┌──────────┬───────────────────────┬───────────────┐
 *   │ Palette  │   Live-Vorschau       │ Eigenschaften │
 *   │ (Blöcke) │  (Block wählen →)     │ (gewählt)     │
 *   └──────────┴───────────────────────┴───────────────┘
 * Bild-Blöcke: Direkt-Upload ODER Auswahl aus der Produkt-Galerie.
 * ────────────────────────────────────────────────────────────────────────── */

const PALETTE: { type: ProduktBlockTyp; label: string; icon: React.ElementType; sub: string }[] = [
  { type: "heading",   label: "Подзаголовок", icon: Heading2,         sub: "H2" },
  { type: "text",      label: "Текст",        icon: Type,             sub: "Абзац" },
  { type: "image",     label: "Изображение",  icon: ImageIcon,        sub: "Фото + подпись" },
  { type: "gallery",   label: "Галерея",      icon: LayoutGrid,       sub: "Сетка фото" },
  { type: "columns",   label: "2 колонки",    icon: Columns2,         sub: "Текст слева/справа" },
  { type: "highlight", label: "Подсказка",    icon: Lightbulb,        sub: "Выделенный блок" },
  { type: "quote",     label: "Цитата",       icon: Quote,            sub: "С автором" },
  { type: "button",    label: "Кнопка",       icon: MousePointerClick, sub: "CTA-ссылка" },
  { type: "divider",   label: "Разделитель",  icon: Minus,            sub: "◆ линия" },
];

const NEU: Record<ProduktBlockTyp, ProduktBlock> = {
  heading:   { type: "heading",   text: "" },
  text:      { type: "text",      text: "" },
  image:     { type: "image",     bild_url: "", caption: "" },
  gallery:   { type: "gallery",   bilder: [] },
  columns:   { type: "columns",   text: "", text2: "" },
  highlight: { type: "highlight", text: "" },
  quote:     { type: "quote",     text: "", caption: "" },
  button:    { type: "button",    label: "Связаться с куратором", url: "/kontakt" },
  divider:   { type: "divider" },
};

const labelFor = (t: ProduktBlockTyp) => PALETTE.find(p => p.type === t)?.label ?? t;

export function ProduktStoryEditor({
  name = "inhalt_blocks",
  initial = [],
  galerie = [],
}: {
  name?:    string;
  initial?: ProduktBlock[];
  galerie?: Produktbild[];
}) {
  const [blocks, setBlocks] = useState<ProduktBlock[]>(initial);
  const [open, setOpen]     = useState(false);

  return (
    <>
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-sans border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment transition-colors"
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        <LayoutPanelTop className="w-4 h-4 text-vintage-gold" />
        Открыть редактор истории
        <span className="text-xs text-vintage-dust">· {blocks.length} блок(ов)</span>
      </button>

      {open && (
        <StoryOverlay
          blocks={blocks}
          setBlocks={setBlocks}
          galerie={galerie}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/* ── Vollbild-3-Pane-Overlay ──────────────────────────────────────────────── */
function StoryOverlay({
  blocks, setBlocks, galerie, onClose,
}: {
  blocks:    ProduktBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<ProduktBlock[]>>;
  galerie:   Produktbild[];
  onClose:   () => void;
}) {
  const [sel, setSel] = useState<number | null>(blocks.length ? 0 : null);

  const add = (t: ProduktBlockTyp) => {
    setBlocks(b => { const next = [...b, { ...NEU[t] }]; setSel(next.length - 1); return next; });
  };
  const remove = (i: number) => setBlocks(b => { const n = b.filter((_, idx) => idx !== i); setSel(s => (s === null ? null : Math.max(0, Math.min(s, n.length - 1)))); return n; });
  const dup    = (i: number) => setBlocks(b => [...b.slice(0, i + 1), { ...b[i] }, ...b.slice(i + 1)]);
  const patch  = (i: number, p: Partial<ProduktBlock>) => setBlocks(b => b.map((blk, idx) => (idx === i ? { ...blk, ...p } : blk)));
  const move   = (i: number, d: number) => setBlocks(b => {
    const j = i + d; if (j < 0 || j >= b.length) return b;
    const arr = [...b]; [arr[i], arr[j]] = [arr[j], arr[i]]; setSel(j); return arr;
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--color-paper, #FDFAF5)" }}>
      {/* Top-Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-vintage-sand bg-vintage-white">
        <div className="flex items-center gap-2">
          <LayoutPanelTop className="w-4 h-4 text-vintage-gold" />
          <span className="font-serif text-base text-vintage-espresso">Редактор истории</span>
          <span className="text-xs text-vintage-dust">· {blocks.length} блок(ов)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.14em", background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-vintage)" }}
        >
          <X className="w-3.5 h-3.5" /> Готово
        </button>
      </div>

      {/* 3 Panes */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[210px_1fr_320px]">
        {/* Palette */}
        <div className="border-r border-vintage-sand bg-vintage-white p-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-2">Блоки</p>
          <div className="flex lg:flex-col gap-2 flex-wrap">
            {PALETTE.map(p => (
              <button
                key={p.type}
                type="button"
                onClick={() => add(p.type)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment transition-colors w-full text-left"
                style={{ borderRadius: "var(--radius-vintage)" }}
              >
                <p.icon className="w-4 h-4 text-vintage-gold shrink-0" />
                <span className="min-w-0">
                  <span className="block leading-tight">{p.label}</span>
                  <span className="block text-[10px] text-vintage-dust">{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Live-Vorschau */}
        <div className="overflow-y-auto p-4 md:p-8" style={{ background: "var(--color-bone)" }}>
          <div className="max-w-2xl mx-auto space-y-4">
            {blocks.length === 0 ? (
              <p className="text-sm text-vintage-dust text-center py-16">
                Слева добавьте блоки — текст, фото, цитату…
              </p>
            ) : blocks.map((b, i) => (
              <div
                key={i}
                onClick={() => setSel(i)}
                className="relative cursor-pointer transition-all"
                style={{ outline: sel === i ? "2px solid var(--color-coral)" : "1px dashed transparent", outlineOffset: 4, borderRadius: 4 }}
              >
                {/* Floating Controls (gewählt) */}
                {sel === i && (
                  <div className="absolute -top-3 right-0 z-10 flex items-center gap-0.5 bg-vintage-white border border-vintage-sand p-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                    <Ctl title="Вверх"      onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Ctl>
                    <Ctl title="Вниз"       onClick={(e) => { e.stopPropagation(); move(i, 1); }}  disabled={i === blocks.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Ctl>
                    <Ctl title="Дублировать" onClick={(e) => { e.stopPropagation(); dup(i); }}><Copy className="w-3.5 h-3.5" /></Ctl>
                    <Ctl title="Удалить"    onClick={(e) => { e.stopPropagation(); remove(i); }} danger><Trash2 className="w-3.5 h-3.5" /></Ctl>
                  </div>
                )}
                <BlockPreview block={b} />
              </div>
            ))}
          </div>
        </div>

        {/* Eigenschaften */}
        <div className="border-l border-vintage-sand bg-vintage-white p-4 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-3">Свойства</p>
          {sel === null || !blocks[sel] ? (
            <p className="text-sm text-vintage-dust">Выберите блок в предпросмотре.</p>
          ) : (
            <BlockProps
              block={blocks[sel]}
              galerie={galerie}
              onPatch={(p) => patch(sel, p)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Ctl({ children, onClick, title, disabled, danger }: {
  children: React.ReactNode; onClick: (e: React.MouseEvent) => void; title: string; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 transition-colors disabled:opacity-30 ${danger ? "text-vintage-burgundy hover:bg-vintage-burgundy/10" : "text-vintage-ink hover:bg-vintage-parchment"}`}
      style={{ borderRadius: "var(--radius-vintage)" }}>
      {children}
    </button>
  );
}

/* ── Block-Vorschau (markenkonform) ───────────────────────────────────────── */
function BlockPreview({ block: b }: { block: ProduktBlock }) {
  if (b.type === "heading") return <h3 className="font-serif text-xl text-vintage-espresso">{b.text || <em className="text-vintage-dust">Подзаголовок…</em>}</h3>;
  if (b.type === "text") return (
    <div className="space-y-2 text-sm text-vintage-ink" style={{ lineHeight: 1.7 }}>
      {(b.text ?? "").trim()
        ? (b.text ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>)
        : <p className="text-vintage-dust italic">Текст абзаца…</p>}
    </div>
  );
  if (b.type === "highlight") return <div className="p-3 text-sm text-vintage-ink" style={{ background: "rgba(201,168,76,0.10)", borderLeft: "3px solid var(--color-gold,#C9A84C)" }}>{b.text || <span className="text-vintage-dust italic">Подсказка…</span>}</div>;
  if (b.type === "quote") return (
    <blockquote className="pl-3 italic text-vintage-ink" style={{ borderLeft: "2px solid var(--color-coral)" }}>
      “{b.text || "Цитата…"}”{b.caption && <cite className="block mt-1 not-italic text-xs text-vintage-dust">— {b.caption}</cite>}
    </blockquote>
  );
  if (b.type === "image") return b.bild_url
    ? (<figure>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={b.bild_url} alt={b.caption ?? ""} className="w-full object-cover" style={{ borderRadius: "var(--radius-vintage)" }} />{b.caption && <figcaption className="text-xs italic text-vintage-dust mt-1">{b.caption}</figcaption>}</figure>)
    : (<div className="flex items-center justify-center gap-2 py-10 text-vintage-dust border border-dashed border-vintage-sand"><ImageIcon className="w-5 h-5" /> Изображение не выбрано</div>);
  if (b.type === "divider") return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
      <span style={{ fontSize: 9, color: "rgba(201,168,76,0.7)" }}>◆</span>
      <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
    </div>
  );
  if (b.type === "columns") return (
    <div className="grid grid-cols-2 gap-4 text-sm text-vintage-ink" style={{ lineHeight: 1.6 }}>
      <div className="space-y-2">{(b.text ?? "").trim() ? (b.text ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>) : <p className="text-vintage-dust italic">Левая колонка…</p>}</div>
      <div className="space-y-2">{(b.text2 ?? "").trim() ? (b.text2 ?? "").split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>) : <p className="text-vintage-dust italic">Правая колонка…</p>}</div>
    </div>
  );
  if (b.type === "button") return (
    <div className="py-1">
      <span className="inline-flex items-center px-5 py-2.5 text-sm font-medium" style={{ background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-button, 4px)" }}>
        {b.label || "Кнопка"}
      </span>
    </div>
  );
  if (b.type === "gallery") {
    const imgs = (b.bilder ?? []).filter(Boolean);
    return imgs.length
      ? (<div className="grid grid-cols-3 gap-1.5">{imgs.map((u, j) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={j} src={u} alt="" className="w-full aspect-square object-cover" style={{ borderRadius: 4 }} />
        ))}</div>)
      : (<div className="flex items-center justify-center gap-2 py-10 text-vintage-dust border border-dashed border-vintage-sand"><LayoutGrid className="w-5 h-5" /> Галерея пуста</div>);
  }
  return null;
}

/* ── Eigenschaften-Panel (je Block-Typ) ───────────────────────────────────── */
const fieldCls = "w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";

function BlockProps({ block: b, galerie, onPatch }: {
  block: ProduktBlock; galerie: Produktbild[]; onPatch: (p: Partial<ProduktBlock>) => void;
}) {
  const [busy, start] = useTransition();

  const upload = (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    start(async () => {
      const r = await storyBildUploadAction(fd);
      if (r.ok && r.url) onPatch({ bild_url: r.url });
      else alert(r.error ?? "Ошибка загрузки");
    });
  };

  /** Galerie-Block: hochgeladenes Bild ans bilder-Array anhängen. */
  const uploadAppend = (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    start(async () => {
      const r = await storyBildUploadAction(fd);
      if (r.ok && r.url) onPatch({ bilder: [...(b.bilder ?? []), r.url] });
      else alert(r.error ?? "Ошибка загрузки");
    });
  };

  const toggleGalerie = (url: string) => {
    const cur = b.bilder ?? [];
    onPatch({ bilder: cur.includes(url) ? cur.filter(u => u !== url) : [...cur, url] });
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-widest text-vintage-gold/80">{labelFor(b.type)}</p>

      {b.type === "heading" && (
        <input className={fieldCls} value={b.text ?? ""} placeholder="Подзаголовок" onChange={e => onPatch({ text: e.target.value })} />
      )}
      {(b.type === "text" || b.type === "highlight") && (
        <textarea className={fieldCls} rows={b.type === "text" ? 8 : 4} value={b.text ?? ""} placeholder={b.type === "text" ? "Текст… (пустая строка = новый абзац)" : "Подсказка…"} onChange={e => onPatch({ text: e.target.value })} />
      )}
      {b.type === "quote" && (
        <>
          <textarea className={fieldCls} rows={3} value={b.text ?? ""} placeholder="Цитата…" onChange={e => onPatch({ text: e.target.value })} />
          <input className={fieldCls} value={b.caption ?? ""} placeholder="Автор / источник" onChange={e => onPatch({ caption: e.target.value })} />
        </>
      )}
      {b.type === "image" && (
        <div className="space-y-3">
          {/* Direkt-Upload */}
          <label
            className="flex items-center justify-center gap-2 py-2.5 text-sm border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment cursor-pointer transition-colors"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-vintage-gold" />}
            {busy ? "Загрузка…" : "Загрузить фото"}
            <input type="file" accept="image/*" className="hidden" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>

          {/* Galerie-Picker */}
          {galerie.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-1.5">Из галереи</p>
              <div className="grid grid-cols-3 gap-1.5">
                {galerie.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onPatch({ bild_url: g.url })}
                    className="relative aspect-square overflow-hidden border transition-all"
                    style={{ borderColor: b.bild_url === g.url ? "var(--color-coral)" : "var(--color-line)", borderWidth: b.bild_url === g.url ? 2 : 1 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url_thumb ?? g.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <input className={fieldCls} value={b.caption ?? ""} placeholder="Подпись (необязательно)" onChange={e => onPatch({ caption: e.target.value })} />
        </div>
      )}

      {b.type === "columns" && (
        <div className="space-y-2">
          <textarea className={fieldCls} rows={5} value={b.text ?? ""} placeholder="Левая колонка…" onChange={e => onPatch({ text: e.target.value })} />
          <textarea className={fieldCls} rows={5} value={b.text2 ?? ""} placeholder="Правая колонка…" onChange={e => onPatch({ text2: e.target.value })} />
        </div>
      )}

      {b.type === "button" && (
        <div className="space-y-2">
          <input className={fieldCls} value={b.label ?? ""} placeholder="Текст кнопки" onChange={e => onPatch({ label: e.target.value })} />
          <input className={fieldCls} value={b.url ?? ""} placeholder="Ссылка (/kontakt или https://…)" onChange={e => onPatch({ url: e.target.value })} />
        </div>
      )}

      {b.type === "divider" && (
        <p className="text-sm text-vintage-dust">Декоративный разделитель ◆ — без настроек.</p>
      )}

      {b.type === "gallery" && (
        <div className="space-y-3">
          <label
            className="flex items-center justify-center gap-2 py-2.5 text-sm border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment cursor-pointer transition-colors"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-vintage-gold" />}
            {busy ? "Загрузка…" : "Добавить фото"}
            <input type="file" accept="image/*" className="hidden" disabled={busy}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadAppend(f); e.target.value = ""; }} />
          </label>

          {/* Aktuelle Galerie-Auswahl (mit Entfernen) */}
          {(b.bilder ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {(b.bilder ?? []).map((u, j) => (
                <div key={j} className="relative aspect-square overflow-hidden border border-vintage-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onPatch({ bilder: (b.bilder ?? []).filter((_, idx) => idx !== j) })}
                    title="Убрать" className="absolute top-0.5 right-0.5 p-1 bg-vintage-white/90 text-vintage-burgundy" style={{ borderRadius: 4 }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Aus Produkt-Galerie auswählen (toggle) */}
          {galerie.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-1.5">Из галереи (нажмите, чтобы добавить)</p>
              <div className="grid grid-cols-3 gap-1.5">
                {galerie.map(g => {
                  const aktiv = (b.bilder ?? []).includes(g.url);
                  return (
                    <button key={g.id} type="button" onClick={() => toggleGalerie(g.url)}
                      className="relative aspect-square overflow-hidden border transition-all"
                      style={{ borderColor: aktiv ? "var(--color-coral)" : "var(--color-line)", borderWidth: aktiv ? 2 : 1 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url_thumb ?? g.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
