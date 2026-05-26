"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Upload, X, Loader2, Wand2, Save, Copy, Check, Image as ImageIcon, AlertCircle,
} from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import type { Kategorie } from "@/types/produkt";

interface Props { kategorien: Kategorie[] }

interface AiResult {
  name:                 string;
  kurzbeschreibung:     string;
  beschreibung:         string;
  era:                  string | null;
  herkunft:             string | null;
  material:             string | null;
  zustand:              "sehr_gut" | "gut" | "akzeptabel" | "restauriert";
  tags:                 string[];
  seo_titel:            string;
  seo_beschreibung:     string;
  instagram_caption:    string;
  instagram_hashtags:   string[];
}

const ZUSTAND_LABEL: Record<string, string> = {
  sehr_gut: "Отличное", gut: "Хорошее", akzeptabel: "Приемлемое", restauriert: "Реставрировано",
};

export function SchnellFormular({ kategorien }: Props) {
  const router = useRouter();
  const [fotos,     setFotos]      = useState<File[]>([]);
  const [notizen,   setNotizen]    = useState("");
  const [preis,     setPreis]      = useState("");
  const [kategorie, setKategorie]  = useState<string>(kategorien[0]?.id ? String(kategorien[0].id) : "");
  const [ai,        setAi]         = useState<AiResult | null>(null);
  const [aiPending, startAi]       = useTransition();
  const [savePending,  startSave]  = useTransition();
  const [error,     setError]      = useState<string | null>(null);
  const [progress,  setProgress]   = useState<string | null>(null);
  const [copied,    setCopied]     = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const kategorieOptions = [
    { value: "", label: "— Без категории —" },
    ...kategorien.map(k => ({ value: String(k.id), label: k.name })),
  ];

  // ───────── Fotos
  const addFotos = (files: FileList | null) => {
    if (!files) return;
    const valid = [...files].filter(f => /^image\/(jpe?g|png|webp|avif)$/.test(f.type) && f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) setError(`${files.length - valid.length} Datei(en) übersprungen (Format/Größe)`);
    setFotos(prev => [...prev, ...valid].slice(0, 12));
  };

  const removeFoto = (i: number) => setFotos(prev => prev.filter((_, idx) => idx !== i));

  // ───────── KI-Extraktion
  const generieren = () => {
    setError(null);
    if (notizen.trim().length < 20) {
      setError("Notizen zu kurz — mindestens 20 Zeichen");
      return;
    }
    const kat = kategorien.find(k => String(k.id) === kategorie)?.name;
    startAi(async () => {
      try {
        const r = await fetch("/api/ai/produkt-extraktor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notizen,
            preis_hint: preis || undefined,
            kategorie:  kat   || undefined,
          }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "AI-Fehler");
        setAi(data);
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    });
  };

  // ───────── Speichern: Produkt erstellen + Fotos hochladen
  const speichern = () => {
    if (!ai) return;
    setError(null);
    if (!preis) { setError("Preis fehlt"); return; }

    startSave(async () => {
      try {
        setProgress("Produkt wird angelegt …");

        // 1. Produkt erstellen via Server Action wäre cleaner, aber FormData-Aufruf
        //    auf existing API ist hier schneller. Wir nutzen direkten DB-Endpoint /api/produkte (POST).
        const erstellenRes = await fetch("/api/produkte", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:             ai.name,
            kurzbeschreibung: ai.kurzbeschreibung,
            beschreibung:     ai.beschreibung,
            preis:            Number(preis),
            kategorie_id:     kategorie ? Number(kategorie) : undefined,
            zustand:          ai.zustand,
            era:              ai.era      ?? undefined,
            herkunft:         ai.herkunft ?? undefined,
            material:         ai.material ?? undefined,
            tags:             ai.tags,
            seo_titel:        ai.seo_titel,
            seo_beschreibung: ai.seo_beschreibung,
            lagerbestand:     1,
            aktiv:            true,
            b2c_mode:         "visible",
          }),
        });
        const produkt = await erstellenRes.json();
        if (!erstellenRes.ok) throw new Error(produkt.error ?? "Produkt-Erstellung fehlgeschlagen");

        // 2. Fotos sequentiell hochladen
        for (let i = 0; i < fotos.length; i++) {
          setProgress(`Foto ${i + 1}/${fotos.length} wird hochgeladen …`);
          const fd = new FormData();
          fd.append("datei", fotos[i]);
          fd.append("produkt_id", produkt.id);
          fd.append("alt_text", `${ai.name} — Foto ${i + 1}`);
          const upRes = await fetch("/api/bilder", { method: "POST", body: fd });
          if (!upRes.ok) console.warn("[upload] Foto", i, "fehlgeschlagen");
        }

        setProgress("Fertig — Weiterleitung …");
        router.push(`/admin/produkte/${produkt.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
        setProgress(null);
      }
    });
  };

  const copyIg = async () => {
    if (!ai) return;
    const text = `${ai.instagram_caption}\n\n${ai.instagram_hashtags.join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {error && (
        <div className="flex items-start gap-3 px-5 py-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30"
             style={{ borderRadius: "var(--radius-card)" }}>
          <AlertCircle className="w-4 h-4 text-vintage-burgundy flex-shrink-0 mt-0.5" />
          <p className="text-sm font-sans text-vintage-burgundy">{error}</p>
        </div>
      )}

      {/* ─── Block A: Fotos ──────────────────────────────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
               style={{ borderRadius: "var(--radius-card)" }}>
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso">Фотографии</h2>
          <p className="text-xs font-sans text-vintage-dust">{fotos.length}/12 · JPG/PNG/WebP · макс. 10 МБ</p>
        </div>

        <label className="block w-full cursor-pointer border-2 border-dashed border-vintage-sand hover:border-vintage-gold hover:bg-vintage-parchment/30 transition-colors p-8 text-center"
               style={{ borderRadius: "var(--radius-card)" }}>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
                 multiple className="sr-only"
                 onChange={(e) => { addFotos(e.target.files); if (fileInput.current) fileInput.current.value = ""; }} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-vintage-gold" />
          <p className="text-sm font-sans text-vintage-brown">
            Перетащите фотографии сюда или <span className="text-vintage-gold underline">выберите</span>
          </p>
        </label>

        {fotos.length > 0 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square bg-vintage-parchment overflow-hidden border border-vintage-sand"
                   style={{ borderRadius: "var(--radius-vintage)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeFoto(i)}
                        className="absolute top-1 right-1 p-1 bg-vintage-espresso/80 text-vintage-cream hover:bg-vintage-burgundy">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Block B: Notizen + Preis + Kategorie ───────────────────── */}
      <section className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Заметки и базовые данные
        </h2>

        <Textarea
          label="Заметки (что это, эпоха, материал, особенности — кратко)"
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          placeholder="напр. Биедермайер комод, около 1840 года, дуб с латунной фурнитурой. Высота 90 см, ширина 110 см. Лёгкая реставрация поверхности, исходные ключи сохранены."
          rows={6}
          hint="Минимум 20 символов. Чем больше деталей, тем лучше KI."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Цена (₸ KZT) *"
            type="number" step="0.01" min="0" required
            value={preis} onChange={(e) => setPreis(e.target.value)}
            placeholder="0.00"
            hint="KI не угадывает цену — введите сами"
          />
          <Select
            label="Категория"
            options={kategorieOptions}
            value={kategorie}
            onChange={(e) => setKategorie((e.target as HTMLSelectElement).value)}
          />
        </div>

        <Button type="button" onClick={generieren} loading={aiPending}
                icon={<Wand2 className="w-3.5 h-3.5" />}>
          Сгенерировать с KI
        </Button>
      </section>

      {/* ─── Block C: KI-Ergebnis (Review) ──────────────────────────── */}
      {aiPending && (
        <div className="flex items-center justify-center gap-3 p-12 text-vintage-dust">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-sans">KI denkt nach (5–15 Sek) …</span>
        </div>
      )}

      {ai && (
        <>
          <section className="bg-vintage-white border border-vintage-gold/40 p-6 space-y-5"
                   style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
              <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-vintage-gold" /> Предложение KI — отредактируйте при необходимости
              </h2>
            </div>

            <Input label="Название" value={ai.name}
                   onChange={(e) => setAi({ ...ai, name: e.target.value })} />
            <Textarea label="Краткое описание" value={ai.kurzbeschreibung} rows={2}
                      onChange={(e) => setAi({ ...ai, kurzbeschreibung: e.target.value })} />
            <Textarea label="Подробное описание (Markdown)" value={ai.beschreibung} rows={10}
                      onChange={(e) => setAi({ ...ai, beschreibung: e.target.value })} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input label="Эпоха" value={ai.era ?? ""}
                     onChange={(e) => setAi({ ...ai, era: e.target.value })} />
              <Input label="Происхождение" value={ai.herkunft ?? ""}
                     onChange={(e) => setAi({ ...ai, herkunft: e.target.value })} />
              <Input label="Материал" value={ai.material ?? ""}
                     onChange={(e) => setAi({ ...ai, material: e.target.value })} />
              <Select label="Состояние" value={ai.zustand}
                      options={Object.entries(ZUSTAND_LABEL).map(([v,l]) => ({ value: v, label: l }))}
                      onChange={(e) => setAi({ ...ai, zustand: (e.target as HTMLSelectElement).value as AiResult["zustand"] })} />
            </div>

            <Input label="Теги (запятая)" value={ai.tags.join(", ")}
                   onChange={(e) => setAi({ ...ai, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} />

            <details className="border-t border-vintage-sand/40 pt-3">
              <summary className="cursor-pointer text-xs font-sans uppercase tracking-widest text-vintage-dust hover:text-vintage-brown">
                SEO (Заголовок + Описание)
              </summary>
              <div className="space-y-3 pt-3">
                <Input label="SEO-заголовок" value={ai.seo_titel} maxLength={70}
                       onChange={(e) => setAi({ ...ai, seo_titel: e.target.value })} />
                <Textarea label="SEO-описание" value={ai.seo_beschreibung} maxLength={160} rows={2}
                          onChange={(e) => setAi({ ...ai, seo_beschreibung: e.target.value })} />
              </div>
            </details>
          </section>

          {/* Instagram-Post */}
          <section className="bg-vintage-espresso border border-vintage-gold/40 text-vintage-cream p-6 space-y-4"
                   style={{ borderRadius: "var(--radius-card)" }}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg text-vintage-gold flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Instagram-пост
              </h2>
              <button type="button" onClick={copyIg}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-sans tracking-widest uppercase border transition-colors ${
                        copied ? "border-vintage-sage text-vintage-sage" : "border-vintage-gold/40 text-vintage-gold hover:bg-vintage-gold hover:text-vintage-espresso"
                      }`}
                      style={{ borderRadius: "var(--radius-button)" }}>
                {copied ? <><Check className="w-3 h-3" /> Скопировано</> : <><Copy className="w-3 h-3" /> Копировать</>}
              </button>
            </div>
            <Textarea label="Caption" value={ai.instagram_caption} rows={6}
                      onChange={(e) => setAi({ ...ai, instagram_caption: e.target.value })} />
            <Textarea label="Hashtags" value={ai.instagram_hashtags.join(" ")} rows={2}
                      onChange={(e) => setAi({ ...ai, instagram_hashtags: e.target.value.split(/\s+/).filter(Boolean) })} />
          </section>

          {/* Save */}
          <div className="flex items-center justify-between gap-3">
            {progress && (
              <p className="text-sm font-sans text-vintage-dust flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}
              </p>
            )}
            <Button type="button" onClick={speichern} loading={savePending}
                    icon={<Save className="w-3.5 h-3.5" />} size="lg" className="ml-auto">
              Создать товар ({fotos.length} {fotos.length === 1 ? "фото" : "фото"})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
