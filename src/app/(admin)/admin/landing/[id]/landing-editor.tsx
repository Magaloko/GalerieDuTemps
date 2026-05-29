"use client";

import { useState, useTransition } from "react";
import {
  Loader2, Save, Eye, Home, Archive, Send, FileEdit, Trash2,
} from "lucide-react";
import {
  landingSpeichernAction, landingStatusAction,
  landingAlsStartseiteAction, landingLoeschenAction, landingBildUploadAction,
} from "../actions";
import { useToast } from "@/components/ui/toast-provider";
import { BlockComposer } from "@/components/blocks/block-composer";
import { BrandSelect } from "@/components/brands/brand-select";
import type { LandingPage, LandingBlock, LandingStatus } from "@/types/landing";
import type { BrandOption } from "@/types/brand";

/* ──────────────────────────────────────────────────────────────────────────
 * LandingEditor — Meta-Kopf + wiederverwendbarer BlockComposer.
 *
 * Der eigentliche Block-Builder (Palette / Vorschau mit Reorder / Eigenschaften
 * inkl. i18n-Tabs, Bild-Upload, bg-Picker) lebt jetzt in
 * @/components/blocks/block-composer und wird auch vom Journal-Editor genutzt.
 * Oben: Titel/Slug/SEO/Status + „Als Startseite" + Speichern + Vorschau-Link.
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_INFO: { code: LandingStatus; label: string; icon: React.ElementType }[] = [
  { code: "entwurf",         label: "Черновик",    icon: FileEdit },
  { code: "veroeffentlicht", label: "Опубликовать", icon: Send },
  { code: "archiviert",      label: "В архив",     icon: Archive },
];

export function LandingEditor({ page, brands = [] }: { page: LandingPage; brands?: BrandOption[] }) {
  const [blocks, setBlocks]   = useState<LandingBlock[]>(page.blocks ?? []);
  const [titel, setTitel]     = useState(page.titel);
  const [slug, setSlug]       = useState(page.slug);
  const [seoT, setSeoT]       = useState(page.seo_titel ?? "");
  const [seoB, setSeoB]       = useState(page.seo_beschreibung ?? "");
  const [brandId, setBrandId] = useState(page.brand_id ?? "");
  const [status, setStatus]   = useState<LandingStatus>(page.status);
  const [istHome, setIstHome] = useState(page.ist_startseite);
  const [pending, start]      = useTransition();
  const toast = useToast();

  // ── Server-Actions ──────────────────────────────────────────────────────
  const speichern = () => {
    start(async () => {
      await landingSpeichernAction(page.id, {
        titel, slug, blocks,
        seo_titel: seoT || null, seo_beschreibung: seoB || null,
        brand_id: brandId || null,
      });
      toast.success("Сохранено ✓");
    });
  };
  const setzeStatus = (s: LandingStatus) => {
    start(async () => {
      await landingSpeichernAction(page.id, { titel, slug, blocks, seo_titel: seoT || null, seo_beschreibung: seoB || null, brand_id: brandId || null });
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
          <BrandSelect brands={brands} value={brandId} onChange={setBrandId} />
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

      {/* ── Block-Builder ─────────────────────────────────────────────────── */}
      <BlockComposer
        blocks={blocks}
        onChange={setBlocks}
        uploadAction={landingBildUploadAction}
        produktQuelleErlaubt
      />
    </div>
  );
}

const fieldCls = "w-full px-3 py-2 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";
