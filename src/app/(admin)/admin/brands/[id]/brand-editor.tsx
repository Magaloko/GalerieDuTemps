"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Save, Eye, Trash2, Upload, Plus, X } from "lucide-react";
import { brandSpeichernAction, brandLoeschenAction, brandBildUploadAction } from "../actions";
import { useToast } from "@/components/ui/toast-provider";
import { BlockComposer } from "@/components/blocks/block-composer";
import type { Brand, BrandVideo } from "@/types/brand";
import type { LandingBlock, I18nText } from "@/types/landing";

/* ──────────────────────────────────────────────────────────────────────────
 * BrandEditor — Meta + Logo/Cover + i18n-Beschreibung + Videos + Intro-Blöcke.
 *
 * Intro-Blöcke nutzen den wiederverwendbaren BlockComposer (produktQuelleErlaubt,
 * damit ein Marken-Showcase auch ein Produkt-Grid haben kann). Logo/Cover via
 * brandBildUploadAction (Story-Bild-Pipeline). Beschreibung RU/EN/DE-Tabs.
 * ────────────────────────────────────────────────────────────────────────── */

const fieldCls = "w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";

const LOCALES: { code: "ru" | "en" | "de"; flag: string }[] = [
  { code: "ru", flag: "🇷🇺" }, { code: "en", flag: "🇬🇧" }, { code: "de", flag: "🇩🇪" },
];

export function BrandEditor({ brand }: { brand: Brand }) {
  const [name, setName] = useState(brand.name);
  const [slug, setSlug] = useState(brand.slug);
  const [logoUrl, setLogoUrl] = useState(brand.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(brand.cover_url ?? "");
  const [beschreibung, setBeschreibung] = useState<I18nText>(brand.beschreibung ?? {});
  const [videos, setVideos] = useState<BrandVideo[]>(brand.videos ?? []);
  const [blocks, setBlocks] = useState<LandingBlock[]>(brand.intro_blocks ?? []);
  const [aktiv, setAktiv] = useState(brand.aktiv);
  const [sortierung, setSortierung] = useState<number>(brand.sortierung ?? 0);
  const [seoT, setSeoT] = useState(brand.seo_titel ?? "");
  const [seoB, setSeoB] = useState(brand.seo_beschreibung ?? "");
  const [descLocale, setDescLocale] = useState<"ru" | "en" | "de">("ru");
  const [logoBusy, setLogoBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const upload = async (file: File, set: (u: string) => void, setBusy: (b: boolean) => void) => {
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await brandBildUploadAction(fd);
    setBusy(false);
    if (r.ok && r.url) set(r.url);
    else toast.error(r.error ?? "Ошибка загрузки");
  };

  const speichern = () => {
    start(async () => {
      await brandSpeichernAction(brand.id, {
        name, slug,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
        beschreibung,
        videos: videos.filter((v) => v.url.trim()),
        intro_blocks: blocks,
        aktiv,
        sortierung,
        seo_titel: seoT || null,
        seo_beschreibung: seoB || null,
      });
      toast.success("Сохранено ✓");
    });
  };

  const loeschen = () => {
    if (!confirm("Удалить бренд безвозвратно? Товары/посты будут отвязаны.")) return;
    start(async () => {
      await brandLoeschenAction(brand.id);
      window.location.href = "/admin/brands";
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Kopf: Meta + Aktionen ─────────────────────────────────────────── */}
      <div className="bg-vintage-white border border-vintage-sand p-4 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Название</span>
            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Slug · /brand/{slug}</span>
            <input className={fieldCls} value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
        </div>

        {/* Logo + Cover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Логотип</span>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-vintage-sand bg-vintage-parchment" style={{ borderRadius: "var(--radius-vintage)" }}>
                {logoUrl && <Image src={logoUrl} alt="" fill sizes="64px" className="object-contain" />}
              </div>
              <UploadBtn busy={logoBusy} label="Загрузить" onFile={(f) => upload(f, setLogoUrl, setLogoBusy)} />
              {logoUrl && <button type="button" onClick={() => setLogoUrl("")} className="text-vintage-burgundy" title="Убрать"><X className="w-4 h-4" /></button>}
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Обложка</span>
            <div className="flex items-center gap-3">
              <div className="relative w-24 h-16 shrink-0 overflow-hidden border border-vintage-sand bg-vintage-parchment" style={{ borderRadius: "var(--radius-vintage)" }}>
                {coverUrl && <Image src={coverUrl} alt="" fill sizes="96px" className="object-cover" />}
              </div>
              <UploadBtn busy={coverBusy} label="Загрузить" onFile={(f) => upload(f, setCoverUrl, setCoverBusy)} />
              {coverUrl && <button type="button" onClick={() => setCoverUrl("")} className="text-vintage-burgundy" title="Убрать"><X className="w-4 h-4" /></button>}
            </div>
          </div>
        </div>

        {/* Beschreibung i18n */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Описание</span>
            <div className="flex gap-0.5">
              {LOCALES.map((l) => {
                const filled = (beschreibung[l.code] ?? "").trim().length > 0;
                return (
                  <button key={l.code} type="button" onClick={() => setDescLocale(l.code)}
                    className={`px-1.5 py-0.5 text-[11px] border transition-colors ${descLocale === l.code ? "border-vintage-gold bg-vintage-parchment" : "border-vintage-sand text-vintage-dust"}`}
                    style={{ borderRadius: 4 }}>
                    {l.flag}{filled ? " •" : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <textarea
            className={fieldCls}
            rows={4}
            value={beschreibung[descLocale] ?? ""}
            onChange={(e) => setBeschreibung({ ...beschreibung, [descLocale]: e.target.value })}
            placeholder="История бренда…"
          />
        </div>

        {/* Sortierung + aktiv + SEO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">SEO-заголовок</span>
            <input className={fieldCls} value={seoT} onChange={(e) => setSeoT(e.target.value)} placeholder={name} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">SEO-описание</span>
            <input className={fieldCls} value={seoB} onChange={(e) => setSeoB(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-vintage-dust">Сортировка</span>
            <input type="number" className={fieldCls} value={sortierung} onChange={(e) => setSortierung(Number(e.target.value) || 0)} />
          </label>
          <label className="flex items-center gap-2 pt-5">
            <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} className="w-4 h-4 accent-vintage-gold" />
            <span className="text-sm text-vintage-ink">Активен (виден на сайте)</span>
          </label>
        </div>

        {/* Aktionen */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={speichern} disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase font-medium text-white disabled:opacity-50"
            style={{ letterSpacing: "0.14em", background: "var(--color-coral)", borderRadius: "var(--radius-vintage)" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Сохранить
          </button>
          <a href={`/brand/${slug}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border border-vintage-sand text-vintage-brown hover:bg-vintage-parchment transition-colors"
            style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}>
            <Eye className="w-3.5 h-3.5" /> Предпросмотр
          </a>
          <button type="button" onClick={loeschen} disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase border border-vintage-burgundy/40 text-vintage-burgundy hover:bg-vintage-burgundy/10 transition-colors ml-auto disabled:opacity-50"
            style={{ letterSpacing: "0.1em", borderRadius: "var(--radius-vintage)" }}>
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </button>
        </div>
      </div>

      {/* ── Videos ────────────────────────────────────────────────────────── */}
      <div className="bg-vintage-white border border-vintage-sand p-4 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-vintage-dust">Видео (YouTube / Vimeo / MP4)</p>
          <button type="button" onClick={() => setVideos([...videos, { url: "" }])}
            className="inline-flex items-center gap-1 text-[11px] text-vintage-coral hover:opacity-80">
            <Plus className="w-3.5 h-3.5" /> Добавить
          </button>
        </div>
        {videos.length === 0 ? (
          <p className="text-sm text-vintage-dust">Видео не добавлены.</p>
        ) : (
          <div className="space-y-2">
            {videos.map((v, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <input className={fieldCls} value={v.url} placeholder="https://youtube.com/watch?v=…"
                    onChange={(e) => setVideos(videos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <input className={fieldCls} value={v.titel ?? ""} placeholder="Заголовок (необязательно)"
                    onChange={(e) => setVideos(videos.map((x, j) => (j === i ? { ...x, titel: e.target.value } : x)))} />
                </div>
                <button type="button" onClick={() => setVideos(videos.filter((_, j) => j !== i))}
                  className="p-2 text-vintage-burgundy hover:bg-vintage-burgundy/10" style={{ borderRadius: "var(--radius-vintage)" }} title="Удалить">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Intro-Blöcke ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-vintage-dust px-1">Дизайн-блоки (вверху страницы бренда)</p>
        <BlockComposer
          blocks={blocks}
          onChange={setBlocks}
          uploadAction={brandBildUploadAction}
          produktQuelleErlaubt
        />
      </div>
    </div>
  );
}

function UploadBtn({ busy, label, onFile }: { busy: boolean; label: string; onFile: (f: File) => void }) {
  return (
    <label className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-vintage-sand text-vintage-ink hover:bg-vintage-parchment cursor-pointer transition-colors" style={{ borderRadius: "var(--radius-vintage)" }}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-vintage-gold" />}
      {busy ? "Загрузка…" : label}
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}
