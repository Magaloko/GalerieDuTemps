"use client";

import { useState, useTransition, useRef } from "react";
import {
  Image as ImageIcon, Type, MousePointerClick, Minus, LayoutGrid, Film,
  Quote, HelpCircle, Megaphone, PanelTop, Package,
  ArrowUp, ArrowDown, Copy, Trash2, Upload, Loader2, GripVertical,
  Save, Eye, Home, Archive, Send, FileEdit,
} from "lucide-react";
import {
  landingSpeichernAction, landingStatusAction,
  landingAlsStartseiteAction, landingLoeschenAction, landingBildUploadAction,
} from "../actions";
import { useToast } from "@/components/ui/toast-provider";
import { STORY_BG, storyBgCss } from "@/components/produkte/story-bg";
import { blockText } from "@/lib/utils/i18n-text";
import type { LandingPage, LandingBlock, LandingBlockType, I18nText, LandingStatus } from "@/types/landing";

/* ──────────────────────────────────────────────────────────────────────────
 * LandingEditor — 3-Pane Block-Editor (nach dem Produkt-Story-Editor-Muster).
 *   ┌──────────┬───────────────────────┬───────────────┐
 *   │ Palette  │   Vorschau (Reorder)  │ Eigenschaften │
 *   └──────────┴───────────────────────┴───────────────┘
 * Oben: Titel/Slug/SEO/Status + „Als Startseite" + Speichern + Vorschau-Link.
 * ────────────────────────────────────────────────────────────────────────── */

const PALETTE: { type: LandingBlockType; label: string; icon: React.ElementType; sub: string }[] = [
  { type: "hero",         label: "Hero",         icon: PanelTop,         sub: "Баннер + CTA" },
  { type: "text",         label: "Текст",        icon: Type,             sub: "Абзацы" },
  { type: "image",        label: "Изображение",  icon: ImageIcon,        sub: "Фото + подпись" },
  { type: "gallery",      label: "Галерея",      icon: LayoutGrid,       sub: "Сетка фото" },
  { type: "product_grid", label: "Товары",       icon: Package,          sub: "Сетка товаров" },
  { type: "button",       label: "Кнопка",       icon: MousePointerClick, sub: "CTA-ссылка" },
  { type: "video",        label: "Видео",        icon: Film,             sub: "YouTube/Vimeo/MP4" },
  { type: "testimonial",  label: "Отзыв",        icon: Quote,            sub: "Цитата + автор" },
  { type: "faq",          label: "FAQ",          icon: HelpCircle,       sub: "Вопрос/ответ" },
  { type: "cta_band",     label: "CTA-полоса",   icon: Megaphone,        sub: "Яркий блок" },
  { type: "divider",      label: "Разделитель",  icon: Minus,            sub: "◆ линия" },
];

const NEU: Record<LandingBlockType, LandingBlock> = {
  hero:         { type: "hero", titel: { ru: "Заголовок" }, subtitel: { ru: "Подзаголовок" }, cta_label: { ru: "Открыть каталог" }, cta_url: "/katalog", align: "center" },
  text:         { type: "text" },
  image:        { type: "image", bild_url: "" },
  gallery:      { type: "gallery", bild_urls: [] },
  product_grid: { type: "product_grid", quelle: "featured", limit: 8 },
  button:       { type: "button", cta_label: { ru: "Подробнее" }, cta_url: "/katalog", align: "center" },
  video:        { type: "video", video_url: "" },
  testimonial:  { type: "testimonial" },
  faq:          { type: "faq" },
  cta_band:     { type: "cta_band", titel: { ru: "Готовы выбрать?" }, cta_label: { ru: "В каталог" }, cta_url: "/katalog", align: "center" },
  divider:      { type: "divider" },
};

const labelFor = (t: LandingBlockType) => PALETTE.find((p) => p.type === t)?.label ?? t;

const STATUS_INFO: { code: LandingStatus; label: string; icon: React.ElementType }[] = [
  { code: "entwurf",         label: "Черновик",    icon: FileEdit },
  { code: "veroeffentlicht", label: "Опубликовать", icon: Send },
  { code: "archiviert",      label: "В архив",     icon: Archive },
];

export function LandingEditor({ page }: { page: LandingPage }) {
  const [blocks, setBlocks]   = useState<LandingBlock[]>(page.blocks ?? []);
  const [titel, setTitel]     = useState(page.titel);
  const [slug, setSlug]       = useState(page.slug);
  const [seoT, setSeoT]       = useState(page.seo_titel ?? "");
  const [seoB, setSeoB]       = useState(page.seo_beschreibung ?? "");
  const [status, setStatus]   = useState<LandingStatus>(page.status);
  const [istHome, setIstHome] = useState(page.ist_startseite);
  const [pending, start]      = useTransition();
  const toast = useToast();

  const [sel, setSel] = useState<number | null>(blocks.length ? 0 : null);
  const dragIndex = useRef<number | null>(null);
  const [dragging, setDragging]   = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Block-Manipulation ──────────────────────────────────────────────────
  const add = (t: LandingBlockType) =>
    setBlocks((b) => { const next = [...b, { ...NEU[t] }]; setSel(next.length - 1); return next; });
  const remove = (i: number) =>
    setBlocks((b) => { const n = b.filter((_, idx) => idx !== i); setSel((s) => (s === null ? null : Math.max(0, Math.min(s, n.length - 1)))); return n; });
  const dup = (i: number) => setBlocks((b) => [...b.slice(0, i + 1), { ...b[i] }, ...b.slice(i + 1)]);
  const patch = (i: number, p: Partial<LandingBlock>) =>
    setBlocks((b) => b.map((blk, idx) => (idx === i ? { ...blk, ...p } : blk)));
  const move = (i: number, d: number) =>
    setBlocks((b) => { const j = i + d; if (j < 0 || j >= b.length) return b; const arr = [...b]; [arr[i], arr[j]] = [arr[j], arr[i]]; setSel(j); return arr; });

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setBlocks((b) => { if (from >= b.length || to >= b.length) return b; const arr = [...b]; const [m] = arr.splice(from, 1); arr.splice(to, 0, m); return arr; });
    setSel(to);
  };
  const blockIndexAtY = (y: number): number | null => {
    const el = listRef.current; if (!el) return null;
    const kids = Array.from(el.querySelectorAll<HTMLElement>("[data-block-index]"));
    for (const k of kids) { if (y < k.getBoundingClientRect().bottom) return Number(k.dataset.blockIndex); }
    return kids.length ? Number(kids[kids.length - 1].dataset.blockIndex) : null;
  };
  const onGripDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragIndex.current = i; setDragging(i); setOverIndex(i);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {/* ignore */}
  };
  const onGripMove = (e: React.PointerEvent) => {
    if (dragIndex.current === null) return;
    const idx = blockIndexAtY(e.clientY);
    if (idx !== null && idx !== overIndex) setOverIndex(idx);
  };
  const onGripUp = (e: React.PointerEvent) => {
    if (dragIndex.current !== null && overIndex !== null) reorder(dragIndex.current, overIndex);
    dragIndex.current = null; setDragging(null); setOverIndex(null);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {/* ignore */}
  };

  // ── Server-Actions ──────────────────────────────────────────────────────
  const speichern = () => {
    start(async () => {
      await landingSpeichernAction(page.id, {
        titel, slug, blocks,
        seo_titel: seoT || null, seo_beschreibung: seoB || null,
      });
      toast.success("Сохранено ✓");
    });
  };
  const setzeStatus = (s: LandingStatus) => {
    start(async () => {
      await landingSpeichernAction(page.id, { titel, slug, blocks, seo_titel: seoT || null, seo_beschreibung: seoB || null });
      await landingStatusAction(page.id, s);
      setStatus(s);
      toast.success("Статус обновлён");
    });
  };
  const toggleHome = () => {
    const next = !istHome;
    start(async () => {
      await landingAlsStartseiteAction(page.id, next);
      setIstHome(next);
      toast.success(next ? "Назначено главной страницей" : "Снято с главной");
    });
  };
  const loeschen = () => {
    if (!confirm("Удалить лендинг безвозвратно?")) return;
    start(async () => {
      await landingLoeschenAction(page.id);
      window.location.href = "/admin/landing";
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Kopf: Meta + Aktionen ─────────────────────────────────────────── */}
      <div className="bg-vintage-white border border-vintage-sand p-4 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Название</span>
            <input className={fieldCls} value={titel} onChange={(e) => setTitel(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Slug · /lp/{slug}</span>
            <input className={fieldCls} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">SEO-заголовок</span>
            <input className={fieldCls} value={seoT} onChange={(e) => setSeoT(e.target.value)} placeholder={titel} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">SEO-описание</span>
            <input className={fieldCls} value={seoB} onChange={(e) => setSeoB(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={speichern}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase font-medium text-white disabled:opacity-50"
            style={{ letterSpacing: "0.14em", background: "var(--color-coral)", borderRadius: "var(--radius-vintage)" }}
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Сохранить
          </button>

          {STATUS_INFO.map((s) => (
            <button
              key={s.code}
              type="button"
              onClick={() => setzeStatus(s.code)}
              disabled={pending}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border transition-colors disabled:opacity-50 ${
                status === s.code ? "border-vintage-gold bg-vintage-parchment text-vintage-espresso" : "border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
              }`}
              style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}
            >
              <s.icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          ))}

          <button
            type="button"
            onClick={toggleHome}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border transition-colors disabled:opacity-50 ${
              istHome ? "border-vintage-gold bg-vintage-gold/10 text-vintage-gold" : "border-vintage-sand text-vintage-brown hover:bg-vintage-parchment"
            }`}
            style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}
          >
            <Home className="w-3.5 h-3.5" /> {istHome ? "Главная ✓" : "Сделать главной"}
          </button>

          <a
            href={`/lp/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border border-vintage-sand text-vintage-brown hover:bg-vintage-parchment transition-colors"
            style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}
          >
            <Eye className="w-3.5 h-3.5" /> Предпросмотр
          </a>

          <button
            type="button"
            onClick={loeschen}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border border-vintage-burgundy/40 text-vintage-burgundy hover:bg-vintage-burgundy/10 transition-colors ml-auto disabled:opacity-50"
            style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </button>
        </div>
        {istHome && status !== "veroeffentlicht" && (
          <p className="text-[11px] text-vintage-burgundy">
            Эта страница назначена главной, но не опубликована — на сайте будет старая главная, пока вы не опубликуете.
          </p>
        )}
      </div>

      {/* ── 3 Panes ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_320px] border border-vintage-sand" style={{ borderRadius: "var(--radius-card)", overflow: "hidden", minHeight: 480 }}>
        {/* Palette */}
        <div className="border-r border-vintage-sand bg-vintage-white p-3 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-2">Блоки</p>
          <div className="flex lg:flex-col gap-2 flex-wrap">
            {PALETTE.map((p) => (
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

        {/* Vorschau */}
        <div className="overflow-y-auto p-4 md:p-6" style={{ background: "var(--color-bone)" }}>
          <div ref={listRef} className="max-w-2xl mx-auto space-y-4">
            {blocks.length === 0 ? (
              <p className="text-sm text-vintage-dust text-center py-16">Слева добавьте блоки — баннер, текст, товары…</p>
            ) : (
              blocks.map((b, i) => (
                <div
                  key={i}
                  data-block-index={i}
                  onClick={() => setSel(i)}
                  className="relative cursor-pointer transition-all"
                  style={{
                    outline: overIndex === i && dragging !== null ? "2px dashed var(--color-coral)" : sel === i ? "2px solid var(--color-coral)" : "1px dashed transparent",
                    outlineOffset: 4,
                    borderRadius: 4,
                    opacity: dragging === i ? 0.4 : 1,
                  }}
                >
                  {sel === i && (
                    <div className="absolute -top-3 right-0 z-10 flex items-center gap-0.5 bg-vintage-white border border-vintage-sand p-0.5" style={{ borderRadius: "var(--radius-vintage)" }}>
                      <span
                        title="Перетащите для сортировки"
                        className="px-1 text-vintage-dust cursor-grab active:cursor-grabbing"
                        style={{ touchAction: "none" }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={onGripDown(i)}
                        onPointerMove={onGripMove}
                        onPointerUp={onGripUp}
                        onPointerCancel={onGripUp}
                      ><GripVertical className="w-3.5 h-3.5" /></span>
                      <Ctl title="Вверх" onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0}><ArrowUp className="w-3.5 h-3.5" /></Ctl>
                      <Ctl title="Вниз" onClick={(e) => { e.stopPropagation(); move(i, 1); }} disabled={i === blocks.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Ctl>
                      <Ctl title="Дублировать" onClick={(e) => { e.stopPropagation(); dup(i); }}><Copy className="w-3.5 h-3.5" /></Ctl>
                      <Ctl title="Удалить" onClick={(e) => { e.stopPropagation(); remove(i); }} danger><Trash2 className="w-3.5 h-3.5" /></Ctl>
                    </div>
                  )}
                  {(() => {
                    const bg = storyBgCss(b.bg);
                    const content = <BlockPreview block={b} />;
                    return bg
                      ? <div style={{ background: bg, padding: "1rem 1.25rem", borderRadius: "var(--radius-card)" }}>{content}</div>
                      : content;
                  })()}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Eigenschaften */}
        <div className="border-l border-vintage-sand bg-vintage-white p-4 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-3">Свойства</p>
          {sel === null || !blocks[sel] ? (
            <p className="text-sm text-vintage-dust">Выберите блок в предпросмотре.</p>
          ) : (
            <BlockProps block={blocks[sel]} onPatch={(p) => patch(sel, p)} />
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

/* ── Block-Vorschau (RU als Primärsprache) ────────────────────────────────── */
function BlockPreview({ block: b }: { block: LandingBlock }) {
  const titel = blockText(b.titel, "ru");
  const subtitel = blockText(b.subtitel, "ru");
  const text = blockText(b.text, "ru");
  const ctaLabel = blockText(b.cta_label, "ru");
  const caption = blockText(b.caption, "ru");
  const quote = blockText(b.quote, "ru");
  const autor = blockText(b.autor, "ru");
  const frage = blockText(b.frage, "ru");

  if (b.type === "hero") return (
    <div className="relative overflow-hidden text-center px-4 py-8" style={{ background: "var(--color-cobalt,#1B2566)", color: "#fff", borderRadius: 4 }}>
      {b.bild_url && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={b.bild_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />)}
      <div className="relative">
        <p className="font-serif text-2xl">{titel || "Заголовок Hero"}</p>
        {subtitel && <p className="text-sm mt-1 opacity-90">{subtitel}</p>}
        {b.cta_url && <span className="inline-block mt-3 px-4 py-1.5 text-xs font-medium" style={{ background: "var(--color-coral)", borderRadius: 4 }}>{ctaLabel || "CTA"}</span>}
      </div>
    </div>
  );
  if (b.type === "text") return (
    <div className="space-y-2 text-sm text-vintage-ink" style={{ lineHeight: 1.7 }}>
      {text.trim() ? text.split(/\n{2,}/).filter(Boolean).map((p, j) => <p key={j}>{p}</p>) : <p className="text-vintage-dust italic">Текст абзаца…</p>}
    </div>
  );
  if (b.type === "image") return b.bild_url
    ? (<figure>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={b.bild_url} alt={caption} className="w-full object-cover" style={{ borderRadius: 4 }} />{caption && <figcaption className="text-xs italic text-vintage-dust mt-1">{caption}</figcaption>}</figure>)
    : (<div className="flex items-center justify-center gap-2 py-10 text-vintage-dust border border-dashed border-vintage-sand"><ImageIcon className="w-5 h-5" /> Изображение не выбрано</div>);
  if (b.type === "gallery") {
    const imgs = (b.bild_urls ?? []).filter(Boolean);
    return imgs.length
      ? (<div className="grid grid-cols-3 gap-1.5">{imgs.map((u, j) => (/* eslint-disable-next-line @next/next/no-img-element */ <img key={j} src={u} alt="" className="w-full aspect-square object-cover" style={{ borderRadius: 4 }} />))}</div>)
      : (<div className="flex items-center justify-center gap-2 py-10 text-vintage-dust border border-dashed border-vintage-sand"><LayoutGrid className="w-5 h-5" /> Галерея пуста</div>);
  }
  if (b.type === "product_grid") return (
    <div className="flex items-center justify-center gap-2 py-8 text-vintage-dust border border-dashed border-vintage-sand" style={{ borderRadius: 4 }}>
      <Package className="w-5 h-5" />
      {b.quelle === "kategorie" ? `Товары: категория «${b.kategorie_slug || "?"}»` : b.quelle === "slugs" ? `Товары: ${(b.produkt_slugs ?? []).length} шт.` : "Товары: избранное"}
      {` · до ${b.limit ?? 8}`}
    </div>
  );
  if (b.type === "button") return (
    <div className="py-1 text-center">
      <span className="inline-flex items-center px-5 py-2.5 text-sm font-medium" style={{ background: "var(--color-coral)", color: "#fff", borderRadius: 4 }}>{ctaLabel || "Кнопка"}</span>
    </div>
  );
  if (b.type === "video") return (
    <div className="flex items-center justify-center gap-2 py-8 text-vintage-dust border border-dashed border-vintage-sand" style={{ borderRadius: 4 }}>
      <Film className="w-5 h-5" /> {b.video_url ? "Видео: " + b.video_url.slice(0, 42) : "Видео не задано"}
    </div>
  );
  if (b.type === "testimonial") return (
    <blockquote className="pl-3 italic text-vintage-ink" style={{ borderLeft: "2px solid var(--color-coral)" }}>
      “{quote || "Отзыв…"}”{autor && <cite className="block mt-1 not-italic text-xs text-vintage-dust">— {autor}</cite>}
    </blockquote>
  );
  if (b.type === "faq") return (
    <div className="border border-vintage-sand bg-white px-3 py-2 text-sm" style={{ borderRadius: 4 }}>
      <p className="font-serif text-vintage-espresso">{frage || "Вопрос…"} <span className="text-vintage-coral">+</span></p>
    </div>
  );
  if (b.type === "cta_band") return (
    <div className="text-center px-4 py-6" style={{ background: "var(--color-coral,#E8703A)", color: "#fff", borderRadius: 4 }}>
      <p className="font-serif text-xl">{titel || "CTA-полоса"}</p>
      {subtitel && <p className="text-sm mt-1 opacity-90">{subtitel}</p>}
      {b.cta_url && <span className="inline-block mt-3 px-4 py-1.5 text-xs font-medium" style={{ background: "#fff", color: "var(--color-cobalt,#1B2566)", borderRadius: 4 }}>{ctaLabel || "CTA"}</span>}
    </div>
  );
  if (b.type === "divider") return (
    <div className="flex items-center gap-3 py-1" aria-hidden>
      <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
      <span style={{ fontSize: 9, color: "rgba(201,168,76,0.7)" }}>◆</span>
      <span className="flex-1 h-px" style={{ background: "rgba(201,168,76,0.35)" }} />
    </div>
  );
  return null;
}

/* ── Eigenschaften ────────────────────────────────────────────────────────── */
const fieldCls = "w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";

const I18N_LOCALES: { code: "ru" | "en" | "de"; flag: string }[] = [
  { code: "ru", flag: "🇷🇺" }, { code: "en", flag: "🇬🇧" }, { code: "de", flag: "🇩🇪" },
];

function I18nField({ value, onChange, multiline, rows, placeholder }: {
  value?: I18nText; onChange: (v: I18nText) => void; multiline?: boolean; rows?: number; placeholder?: string;
}) {
  const [active, setActive] = useState<"ru" | "en" | "de">("ru");
  const v = value ?? {};
  const set = (s: string) => onChange({ ...v, [active]: s });
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {I18N_LOCALES.map((l) => {
          const filled = (v[l.code] ?? "").trim().length > 0;
          return (
            <button key={l.code} type="button" onClick={() => setActive(l.code)}
              className={`px-1.5 py-0.5 text-[11px] border transition-colors ${active === l.code ? "border-vintage-gold bg-vintage-parchment" : "border-vintage-sand text-vintage-dust"}`}
              style={{ borderRadius: 4 }}>
              {l.flag}{filled ? " •" : ""}
            </button>
          );
        })}
      </div>
      {multiline
        ? <textarea className={fieldCls} rows={rows ?? 4} value={v[active] ?? ""} placeholder={placeholder} onChange={(e) => set(e.target.value)} />
        : <input className={fieldCls} value={v[active] ?? ""} placeholder={placeholder} onChange={(e) => set(e.target.value)} />}
    </div>
  );
}

function AlignPicker({ value, onChange }: { value?: string; onChange: (v: "left" | "center" | "right") => void }) {
  const opts: { v: "left" | "center" | "right"; label: string }[] = [
    { v: "left", label: "Слева" }, { v: "center", label: "Центр" }, { v: "right", label: "Справа" },
  ];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-1.5">Выравнивание</p>
      <div className="flex gap-1.5">
        {opts.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`px-2.5 py-1 text-xs border transition-colors ${(value ?? "center") === o.v ? "border-vintage-gold bg-vintage-parchment" : "border-vintage-sand text-vintage-dust"}`}
            style={{ borderRadius: 4 }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockProps({ block: b, onPatch }: { block: LandingBlock; onPatch: (p: Partial<LandingBlock>) => void }) {
  const [busy, start] = useTransition();
  const toast = useToast();

  const uploadTo = (file: File, to: "bild_url" | "gallery") => {
    const fd = new FormData(); fd.append("file", file);
    start(async () => {
      const r = await landingBildUploadAction(fd);
      if (r.ok && r.url) {
        if (to === "gallery") onPatch({ bild_urls: [...(b.bild_urls ?? []), r.url] });
        else onPatch({ bild_url: r.url });
      } else toast.error(r.error ?? "Ошибка загрузки");
    });
  };

  const UploadBtn = ({ to, label }: { to: "bild_url" | "gallery"; label: string }) => (
    <label className="flex items-center justify-center gap-2 py-2.5 text-sm border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment cursor-pointer transition-colors" style={{ borderRadius: "var(--radius-vintage)" }}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-vintage-gold" />}
      {busy ? "Загрузка…" : label}
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTo(f, to); e.target.value = ""; }} />
    </label>
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-widest text-vintage-gold/80">{labelFor(b.type)}</p>

      {b.type === "hero" && (
        <>
          <Label>Заголовок</Label><I18nField value={b.titel} onChange={(v) => onPatch({ titel: v })} placeholder="Заголовок" />
          <Label>Подзаголовок</Label><I18nField value={b.subtitel} onChange={(v) => onPatch({ subtitel: v })} placeholder="Подзаголовок" />
          <Label>Кнопка</Label><I18nField value={b.cta_label} onChange={(v) => onPatch({ cta_label: v })} placeholder="Текст кнопки" />
          <input className={fieldCls} value={b.cta_url ?? ""} placeholder="Ссылка (/katalog или https://…)" onChange={(e) => onPatch({ cta_url: e.target.value })} />
          <Label>Фоновое фото</Label><UploadBtn to="bild_url" label="Загрузить фото" />
          {b.bild_url && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={b.bild_url} alt="" className="w-full object-cover" style={{ borderRadius: 4, maxHeight: 120 }} />)}
          <input className={fieldCls} value={b.video_url ?? ""} placeholder="ИЛИ видео-фон: .mp4 URL" onChange={(e) => onPatch({ video_url: e.target.value })} />
          <AlignPicker value={b.align} onChange={(v) => onPatch({ align: v })} />
        </>
      )}

      {b.type === "text" && (
        <>
          <I18nField multiline rows={8} value={b.text} onChange={(v) => onPatch({ text: v })} placeholder="Текст… (пустая строка = новый абзац)" />
          <AlignPicker value={b.align} onChange={(v) => onPatch({ align: v })} />
        </>
      )}

      {b.type === "image" && (
        <>
          <UploadBtn to="bild_url" label="Загрузить фото" />
          {b.bild_url && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={b.bild_url} alt="" className="w-full object-cover" style={{ borderRadius: 4 }} />)}
          <input className={fieldCls} value={b.bild_url ?? ""} placeholder="или URL изображения" onChange={(e) => onPatch({ bild_url: e.target.value })} />
          <Label>Подпись</Label><I18nField value={b.caption} onChange={(v) => onPatch({ caption: v })} placeholder="Подпись (необязательно)" />
        </>
      )}

      {b.type === "gallery" && (
        <>
          <UploadBtn to="gallery" label="Добавить фото" />
          {(b.bild_urls ?? []).length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {(b.bild_urls ?? []).map((u, j) => (
                <div key={j} className="relative aspect-square overflow-hidden border border-vintage-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onPatch({ bild_urls: (b.bild_urls ?? []).filter((_, idx) => idx !== j) })}
                    title="Убрать" className="absolute top-0.5 right-0.5 p-1 bg-vintage-white/90 text-vintage-burgundy" style={{ borderRadius: 4 }}>
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {b.type === "product_grid" && (
        <>
          <Label>Источник</Label>
          <div className="flex gap-1.5 flex-wrap">
            {([["featured", "Избранное"], ["kategorie", "Категория"], ["slugs", "По slug"]] as const).map(([q, lbl]) => (
              <button key={q} type="button" onClick={() => onPatch({ quelle: q })}
                className={`px-2.5 py-1 text-xs border transition-colors ${(b.quelle ?? "featured") === q ? "border-vintage-gold bg-vintage-parchment" : "border-vintage-sand text-vintage-dust"}`}
                style={{ borderRadius: 4 }}>{lbl}</button>
            ))}
          </div>
          {b.quelle === "kategorie" && (
            <><Label>Slug категории</Label><input className={fieldCls} value={b.kategorie_slug ?? ""} placeholder="например: kartiny" onChange={(e) => onPatch({ kategorie_slug: e.target.value })} /></>
          )}
          {b.quelle === "slugs" && (
            <><Label>Slug товаров (по одному на строку)</Label>
              <textarea className={fieldCls} rows={4} value={(b.produkt_slugs ?? []).join("\n")} placeholder={"slug-tovara-1\nslug-tovara-2"}
                onChange={(e) => onPatch({ produkt_slugs: e.target.value.split(/\n+/).map((s) => s.trim()).filter(Boolean) })} /></>
          )}
          <Label>Максимум карточек</Label>
          <input type="number" min={1} max={24} className={fieldCls} value={b.limit ?? 8} onChange={(e) => onPatch({ limit: Math.max(1, Math.min(24, Number(e.target.value) || 8)) })} />
        </>
      )}

      {b.type === "button" && (
        <>
          <I18nField value={b.cta_label} onChange={(v) => onPatch({ cta_label: v })} placeholder="Текст кнопки" />
          <input className={fieldCls} value={b.cta_url ?? ""} placeholder="Ссылка (/katalog или https://…)" onChange={(e) => onPatch({ cta_url: e.target.value })} />
          <AlignPicker value={b.align} onChange={(v) => onPatch({ align: v })} />
        </>
      )}

      {b.type === "video" && (
        <>
          <input className={fieldCls} value={b.video_url ?? ""} placeholder="YouTube / Vimeo / .mp4 URL" onChange={(e) => onPatch({ video_url: e.target.value })} />
          <p className="text-[11px] text-vintage-dust">youtube.com, youtu.be, vimeo.com, прямые .mp4/.webm.</p>
        </>
      )}

      {b.type === "testimonial" && (
        <>
          <Label>Цитата</Label><I18nField multiline rows={3} value={b.quote} onChange={(v) => onPatch({ quote: v })} placeholder="Текст отзыва…" />
          <Label>Автор</Label><I18nField value={b.autor} onChange={(v) => onPatch({ autor: v })} placeholder="Имя / источник" />
        </>
      )}

      {b.type === "faq" && (
        <>
          <Label>Вопрос</Label><I18nField value={b.frage} onChange={(v) => onPatch({ frage: v })} placeholder="Вопрос?" />
          <Label>Ответ</Label><I18nField multiline rows={5} value={b.antwort} onChange={(v) => onPatch({ antwort: v })} placeholder="Ответ…" />
        </>
      )}

      {b.type === "cta_band" && (
        <>
          <Label>Заголовок</Label><I18nField value={b.titel} onChange={(v) => onPatch({ titel: v })} placeholder="Заголовок" />
          <Label>Подзаголовок</Label><I18nField value={b.subtitel} onChange={(v) => onPatch({ subtitel: v })} placeholder="Подзаголовок" />
          <Label>Кнопка</Label><I18nField value={b.cta_label} onChange={(v) => onPatch({ cta_label: v })} placeholder="Текст кнопки" />
          <input className={fieldCls} value={b.cta_url ?? ""} placeholder="Ссылка (/katalog или https://…)" onChange={(e) => onPatch({ cta_url: e.target.value })} />
          <AlignPicker value={b.align} onChange={(v) => onPatch({ align: v })} />
        </>
      )}

      {b.type === "divider" && (
        <p className="text-sm text-vintage-dust">Декоративный разделитель ◆ — без настроек.</p>
      )}

      {/* Block-Hintergrund (außer Hero/CTA-Band/Divider — die haben eigene Farbe) */}
      {b.type !== "divider" && b.type !== "hero" && b.type !== "cta_band" && (
        <div className="pt-3 mt-1 border-t border-vintage-sand/50">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-2">Фон блока</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STORY_BG).map(([key, v]) => {
              const aktiv = (b.bg ?? "standard") === key;
              return (
                <button key={key} type="button" title={v.label} onClick={() => onPatch({ bg: key })}
                  className="w-7 h-7 transition-all"
                  style={{
                    background: key === "standard" ? "repeating-linear-gradient(45deg,#fff,#fff 3px,#eee 3px,#eee 6px)" : v.swatch,
                    border: aktiv ? "2px solid var(--color-coral)" : "1px solid var(--color-line)",
                    borderRadius: "var(--radius-vintage)",
                  }} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] uppercase tracking-widest text-vintage-dust">{children}</p>;
}
