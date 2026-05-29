"use client";

import { useState, useTransition } from "react";
import { Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BlockComposer } from "@/components/blocks/block-composer";
import { BrandSelect } from "@/components/brands/brand-select";
import { postUpdateAction, postDeleteAction, journalBildUploadAction } from "../../actions";
import type { JournalPost } from "@/types/newsletter";
import type { LandingBlock } from "@/types/landing";
import type { BrandOption } from "@/types/brand";

export function JournalEditor({ post, brands = [] }: { post: JournalPost; brands?: BrandOption[] }) {
  const [titel,    setTitel]    = useState(post.titel);
  const [excerpt,  setExcerpt]  = useState(post.excerpt ?? "");
  const [cover,    setCover]    = useState(post.cover_bild_url ?? "");
  const [blocks,   setBlocks]   = useState<LandingBlock[]>(post.blocks ?? []);
  const [tagsRaw,  setTagsRaw]  = useState(post.tags.join(", "));
  const [seoTitel, setSeoTitel] = useState(post.seo_titel ?? "");
  const [seoBesch, setSeoBesch] = useState(post.seo_beschreibung ?? "");
  const [veroeff,  setVeroeff]  = useState(post.veroeffentlicht);
  const [brandId,  setBrandId]  = useState(post.brand_id ?? "");
  const [meldung,  setMeldung]  = useState("");
  const [pending, startTransition] = useTransition();

  // Bestandsposts: haben Markdown, aber (noch) keine Blocks.
  const istLegacyMarkdown = blocks.length === 0 && (post.markdown ?? "").trim().length > 0;

  const handleSpeichern = () => {
    setMeldung("Сохранение…");
    startTransition(async () => {
      await postUpdateAction(post.id, {
        titel,
        excerpt:         excerpt || undefined,
        cover_bild_url:  cover   || undefined,
        blocks,
        tags:            tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
        brand_id:        brandId || null,
        seo_titel:       seoTitel || undefined,
        seo_beschreibung: seoBesch || undefined,
        veroeffentlicht: veroeff,
      });
      setMeldung("Сохранено ✓");
      setTimeout(() => setMeldung(""), 2000);
    });
  };

  const handleLoeschen = () => {
    if (!confirm("Удалить публикацию?")) return;
    startTransition(() => postDeleteAction(post.id));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <Input label="Заголовок" value={titel} onChange={(e) => setTitel(e.target.value)} required />
          <Input label="URL обложки" value={cover} onChange={(e) => setCover(e.target.value)} />
          <Textarea label="Краткое описание" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={500} />
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso">Контент</h2>
          {istLegacyMarkdown && (
            <p className="text-xs font-sans text-vintage-brown bg-vintage-parchment border border-vintage-sand p-3" style={{ borderRadius: "var(--radius-vintage)" }}>
              Эта публикация была написана в старом Markdown-редакторе. Пока вы не добавите блоки,
              на сайте показывается прежний Markdown-текст. Добавьте блоки слева — после сохранения
              статья будет отображаться через блоки.
            </p>
          )}
          <BlockComposer
            blocks={blocks}
            onChange={setBlocks}
            uploadAction={journalBildUploadAction}
            produktQuelleErlaubt={false}
          />
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso">Теги и SEO</h2>
          <Input label="Теги (через запятую)" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="винтаж, уход, история" />
          <Input label="SEO-заголовок" value={seoTitel} onChange={(e) => setSeoTitel(e.target.value)} maxLength={70} />
          <Textarea label="SEO-описание" value={seoBesch} onChange={(e) => setSeoBesch(e.target.value)} rows={2} maxLength={160} />
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso">Публикация</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={veroeff} onChange={(e) => setVeroeff(e.target.checked)} className="w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-ink">Опубликовано в Journal</span>
          </label>
          <BrandSelect brands={brands} value={brandId} onChange={setBrandId} />
          <Button onClick={handleSpeichern} loading={pending} icon={<Save className="w-3.5 h-3.5" />} className="w-full justify-center">
            Сохранить
          </Button>
          {meldung && (
            <p className={`text-xs font-sans text-center ${meldung.includes("✓") ? "text-vintage-sage" : "text-vintage-dust"}`}>
              {meldung}
            </p>
          )}
        </section>

        <button onClick={handleLoeschen} disabled={pending}
          className="w-full flex items-center justify-center gap-1 px-4 py-2 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-button)" }}>
          <Trash2 className="w-3 h-3" /> Удалить
        </button>
      </div>
    </div>
  );
}
