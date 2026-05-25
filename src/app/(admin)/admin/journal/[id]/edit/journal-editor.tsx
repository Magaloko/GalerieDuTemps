"use client";

import { useState, useTransition } from "react";
import { Save, Trash2, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import { postUpdateAction, postDeleteAction } from "../../actions";
import type { JournalPost } from "@/types/newsletter";

export function JournalEditor({ post }: { post: JournalPost }) {
  const [titel,    setTitel]    = useState(post.titel);
  const [excerpt,  setExcerpt]  = useState(post.excerpt ?? "");
  const [cover,    setCover]    = useState(post.cover_bild_url ?? "");
  const [markdown, setMarkdown] = useState(post.markdown);
  const [tagsRaw,  setTagsRaw]  = useState(post.tags.join(", "));
  const [seoTitel, setSeoTitel] = useState(post.seo_titel ?? "");
  const [seoBesch, setSeoBesch] = useState(post.seo_beschreibung ?? "");
  const [veroeff,  setVeroeff]  = useState(post.veroeffentlicht);
  const [vorschau, setVorschau] = useState(false);
  const [meldung,  setMeldung]  = useState("");
  const [pending, startTransition] = useTransition();

  const html = marked.parse(markdown ?? "", { gfm: true, async: false }) as string;

  const handleSpeichern = () => {
    setMeldung("Speichere…");
    startTransition(async () => {
      await postUpdateAction(post.id, {
        titel,
        excerpt:         excerpt || undefined,
        cover_bild_url:  cover   || undefined,
        markdown,
        tags:            tagsRaw.split(",").map(t => t.trim()).filter(Boolean),
        seo_titel:       seoTitel || undefined,
        seo_beschreibung: seoBesch || undefined,
        veroeffentlicht: veroeff,
      });
      setMeldung("Gespeichert ✓");
      setTimeout(() => setMeldung(""), 2000);
    });
  };

  const handleLoeschen = () => {
    if (!confirm("Beitrag löschen?")) return;
    startTransition(() => postDeleteAction(post.id));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <Input label="Titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
          <Input label="Cover-Bild URL" value={cover} onChange={(e) => setCover(e.target.value)} />
          <Textarea label="Excerpt / Anrisstext" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={500} />
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-vintage-espresso">Inhalt (Markdown)</h2>
            <button onClick={() => setVorschau(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans uppercase tracking-widest text-vintage-brown border border-vintage-sand hover:bg-vintage-parchment transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}>
              {vorschau ? <><EyeOff className="w-3 h-3" /> Editor</> : <><Eye className="w-3 h-3" /> Vorschau</>}
            </button>
          </div>
          {vorschau ? (
            <div className="prose max-w-none p-4 bg-vintage-parchment min-h-96 font-sans text-vintage-ink leading-relaxed prose-headings:font-serif prose-headings:text-vintage-espresso prose-a:text-vintage-brown"
              style={{ borderRadius: "var(--radius-vintage)" }}
              dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={20}
              placeholder="# Überschrift&#10;&#10;Dein **Markdown**-Text…"
              className="w-full px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-mono text-vintage-ink focus:outline-none focus:border-vintage-brown resize-y"
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
          )}
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso">Tags & SEO</h2>
          <Input label="Tags (kommagetrennt)" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="vintage, pflege, geschichte" />
          <Input label="SEO-Titel" value={seoTitel} onChange={(e) => setSeoTitel(e.target.value)} maxLength={70} />
          <Textarea label="SEO-Beschreibung" value={seoBesch} onChange={(e) => setSeoBesch(e.target.value)} rows={2} maxLength={160} />
        </section>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso">Veröffentlichen</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={veroeff} onChange={(e) => setVeroeff(e.target.checked)} className="w-4 h-4 accent-vintage-gold" />
            <span className="text-sm font-sans text-vintage-ink">Live im Journal</span>
          </label>
          <Button onClick={handleSpeichern} loading={pending} icon={<Save className="w-3.5 h-3.5" />} className="w-full justify-center">
            Speichern
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
          <Trash2 className="w-3 h-3" /> Löschen
        </button>
      </div>
    </div>
  );
}
