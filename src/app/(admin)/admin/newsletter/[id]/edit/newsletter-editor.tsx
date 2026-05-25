"use client";

import { useState, useTransition } from "react";
import { Save, Send, Plus, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { newsletterUpdateAction, newsletterTestAction, newsletterVersendenAction, newsletterDeleteAction } from "../../actions";
import type { Newsletter, NewsletterBlock, NewsletterBlockType } from "@/types/newsletter";
import type { Segment } from "@/types/crm";

const NEUE_BLOCKS: Record<NewsletterBlockType, NewsletterBlock> = {
  hero:         { type: "hero",     titel: "Überschrift", subtitel: "Untertitel", cta_label: "Mehr ansehen", cta_url: "/katalog" },
  text:         { type: "text",     html: "<p>Dein Text…</p>" },
  produkt:      { type: "produkt",  titel: "Produkt", subtitel: "Beschreibung", produkt_slug: "" },
  button:       { type: "button",   label: "CTA-Button", url: "/katalog" },
  divider:      { type: "divider" },
  two_columns:  { type: "two_columns", links_html: "<p>Links</p>", rechts_html: "<p>Rechts</p>" },
  image:        { type: "image",    bild_url: "" },
};

export function NewsletterEditor({
  newsletter,
  segments,
}: { newsletter: Newsletter; segments: Segment[] }) {
  const [titel,    setTitel]    = useState(newsletter.titel);
  const [betreff,  setBetreff]  = useState(newsletter.betreff);
  const [preheader, setPreheader] = useState(newsletter.preheader ?? "");
  const [blocks,   setBlocks]   = useState<NewsletterBlock[]>(newsletter.blocks ?? []);
  const [segmentId, setSegmentId] = useState(newsletter.segment_id ?? "");
  const [testEmail, setTestEmail] = useState("");
  const [meldung,  setMeldung]  = useState("");
  const [pending, startTransition] = useTransition();

  const istVersendet = newsletter.status === "versendet";

  // Block-Manipulation
  const addBlock = (typ: NewsletterBlockType) => setBlocks([...blocks, { ...NEUE_BLOCKS[typ] }]);
  const remove   = (i: number) => setBlocks(blocks.filter((_, idx) => idx !== i));
  const update   = (i: number, patch: Partial<NewsletterBlock>) =>
    setBlocks(blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const move     = (i: number, delta: number) => {
    const arr = [...blocks];
    const newI = i + delta;
    if (newI < 0 || newI >= arr.length) return;
    [arr[i], arr[newI]] = [arr[newI], arr[i]];
    setBlocks(arr);
  };

  const handleSpeichern = () => {
    setMeldung("Speichere…");
    startTransition(async () => {
      await newsletterUpdateAction(newsletter.id, {
        titel, betreff, preheader, blocks, segment_id: segmentId || null,
      });
      setMeldung("Gespeichert ✓");
      setTimeout(() => setMeldung(""), 2000);
    });
  };

  const handleTest = () => {
    if (!testEmail || !testEmail.includes("@")) { alert("E-Mail eingeben"); return; }
    startTransition(async () => {
      // Erst speichern
      await newsletterUpdateAction(newsletter.id, { titel, betreff, preheader, blocks, segment_id: segmentId || null });
      const r = await newsletterTestAction(newsletter.id, testEmail);
      alert(r.ok ? `Test-Mail an ${testEmail} gesendet` : `Fehler: ${r.fehler}`);
    });
  };

  const handleVersand = () => {
    if (!confirm("Newsletter jetzt an alle Empfänger versenden? Dies kann nicht rückgängig gemacht werden.")) return;
    startTransition(async () => {
      await newsletterUpdateAction(newsletter.id, { titel, betreff, preheader, blocks, segment_id: segmentId || null });
      const r = await newsletterVersendenAction(newsletter.id);
      if (r.ok) alert(`✓ Newsletter an ${r.anzahl} Empfänger versendet`);
      else      alert(`Fehler: ${r.fehler}`);
    });
  };

  const handleLoeschen = () => {
    if (!confirm("Newsletter unwiderruflich löschen?")) return;
    startTransition(() => newsletterDeleteAction(newsletter.id));
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Linke 2/3: Editor */}
      <div className="lg:col-span-2 space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso">Metadaten</h2>
          <Input label="Interner Titel" value={titel} onChange={(e) => setTitel(e.target.value)} required />
          <Input label="Betreff (E-Mail)" value={betreff} onChange={(e) => setBetreff(e.target.value)} required />
          <Input label="Preheader (Vorschau-Text)" value={preheader} onChange={(e) => setPreheader(e.target.value)} hint="Wird in der Inbox-Vorschau angezeigt" />
        </section>

        {/* Blocks */}
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-lg text-vintage-espresso">Inhalte ({blocks.length} Blöcke)</h2>

          {blocks.length === 0 ? (
            <p className="text-vintage-dust text-sm font-sans text-center py-6 italic">
              Noch keine Blöcke. Füge unten welche hinzu.
            </p>
          ) : blocks.map((block, i) => (
            <div key={i} className="border border-vintage-sand p-3 bg-vintage-parchment/40" style={{ borderRadius: "var(--radius-vintage)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-vintage-gold uppercase">{block.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-vintage-dust hover:text-vintage-brown disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => move(i, +1)} disabled={i === blocks.length - 1} className="p-1 text-vintage-dust hover:text-vintage-brown disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  <button onClick={() => remove(i)} className="p-1 text-vintage-dust hover:text-vintage-burgundy"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <BlockEditor block={block} onChange={(patch) => update(i, patch)} />
            </div>
          ))}

          {/* Add-Block-Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-vintage-sand">
            {(Object.keys(NEUE_BLOCKS) as NewsletterBlockType[]).map(typ => (
              <button key={typ} onClick={() => addBlock(typ)}
                className="px-3 py-1.5 text-xs font-sans uppercase tracking-widest text-vintage-brown border border-vintage-sand hover:bg-vintage-parchment transition-colors flex items-center gap-1"
                style={{ borderRadius: "var(--radius-button)" }}>
                <Plus className="w-3 h-3" /> {typ}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Rechte 1/3: Aktionen */}
      <div className="space-y-4">
        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso">Aktionen</h2>

          <Button onClick={handleSpeichern} loading={pending} icon={<Save className="w-3.5 h-3.5" />} className="w-full justify-center">
            Speichern
          </Button>

          {meldung && (
            <p className={`text-xs font-sans text-center ${meldung.includes("✓") ? "text-vintage-sage" : "text-vintage-dust"}`}>
              {meldung}
            </p>
          )}

          <a href={`/api/admin/newsletter/${newsletter.id}/preview`} target="_blank"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-vintage-sand text-vintage-brown font-sans text-xs tracking-widest uppercase hover:bg-vintage-parchment transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}>
            <Eye className="w-3.5 h-3.5" /> Vorschau
          </a>
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso">Test-Versand</h2>
          <Input label="E-Mail" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@beispiel.de" />
          <Button onClick={handleTest} variant="secondary" loading={pending} className="w-full justify-center">
            Test senden
          </Button>
        </section>

        <section className="bg-vintage-white border border-vintage-sand p-5 space-y-3" style={{ borderRadius: "var(--radius-card)" }}>
          <h2 className="font-serif text-base text-vintage-espresso">Vollversand</h2>
          <Select label="Segment (optional)" value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            options={[{ value: "", label: "Alle aktiven Subscriber" }, ...segments.map(s => ({ value: s.id, label: s.name }))]}
          />
          <Button onClick={handleVersand} loading={pending} disabled={istVersendet} icon={<Send className="w-3.5 h-3.5" />} className="w-full justify-center">
            {istVersendet ? "Bereits versendet" : "Jetzt versenden"}
          </Button>
        </section>

        <button onClick={handleLoeschen} disabled={pending}
          className="w-full flex items-center justify-center gap-1 px-4 py-2 border border-vintage-burgundy text-vintage-burgundy text-xs font-sans tracking-widest uppercase hover:bg-vintage-burgundy/10 transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-button)" }}>
          <Trash2 className="w-3 h-3" /> Newsletter löschen
        </button>
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: NewsletterBlock; onChange: (patch: Partial<NewsletterBlock>) => void }) {
  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-2">
          <Input label="Titel" value={block.titel ?? ""} onChange={(e) => onChange({ titel: e.target.value })} />
          <Input label="Untertitel" value={block.subtitel ?? ""} onChange={(e) => onChange({ subtitel: e.target.value })} />
          <Input label="Bild-URL" value={block.bild_url ?? ""} onChange={(e) => onChange({ bild_url: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Button-Text" value={block.cta_label ?? ""} onChange={(e) => onChange({ cta_label: e.target.value })} />
            <Input label="Button-URL" value={block.cta_url ?? ""} onChange={(e) => onChange({ cta_url: e.target.value })} />
          </div>
        </div>
      );
    case "text":
      return <Textarea label="HTML" value={block.html ?? ""} onChange={(e) => onChange({ html: e.target.value })} rows={5} hint="HTML erlaubt: <p>, <strong>, <em>, <a>, <br>" />;
    case "produkt":
      return (
        <div className="space-y-2">
          <Input label="Produkt-Slug" value={block.produkt_slug ?? ""} onChange={(e) => onChange({ produkt_slug: e.target.value })} />
          <Input label="Titel-Override" value={block.titel ?? ""} onChange={(e) => onChange({ titel: e.target.value })} />
          <Input label="Untertitel" value={block.subtitel ?? ""} onChange={(e) => onChange({ subtitel: e.target.value })} />
        </div>
      );
    case "button":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input label="Text" value={block.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} />
          <Input label="URL" value={block.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} />
        </div>
      );
    case "image":
      return <Input label="Bild-URL" value={block.bild_url ?? ""} onChange={(e) => onChange({ bild_url: e.target.value })} />;
    case "two_columns":
      return (
        <div className="grid grid-cols-2 gap-2">
          <Textarea label="Links HTML" value={block.links_html ?? ""} onChange={(e) => onChange({ links_html: e.target.value })} rows={4} />
          <Textarea label="Rechts HTML" value={block.rechts_html ?? ""} onChange={(e) => onChange({ rechts_html: e.target.value })} rows={4} />
        </div>
      );
    case "divider":
      return <p className="text-xs text-vintage-dust font-sans italic">Trennlinie (keine Optionen)</p>;
    default:
      return null;
  }
}
