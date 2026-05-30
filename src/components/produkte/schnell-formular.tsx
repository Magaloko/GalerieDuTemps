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
import { PreisMultiCurrency } from "./preis-multi-currency";
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
  const [waehrung,  setWaehrung]   = useState<string>("KZT");
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
  // Akzeptiert: JPG/PNG/WebP/AVIF + iOS-HEIC/HEIF. Filename-Endung als
  // Fallback weil manche Browser bei HEIC den MIME-Type leer lassen.
  const addFotos = (files: FileList | null) => {
    if (!files) return;
    const valid = [...files].filter(f => {
      const okType = /^image\/(jpe?g|png|webp|avif|heic|heif)$/.test(f.type);
      const okExt  = /\.(jpe?g|png|webp|avif|heic|heif)$/i.test(f.name);
      const okSize = f.size <= 10 * 1024 * 1024;
      return (okType || okExt) && okSize;
    });
    if (valid.length < files.length) setError(`${files.length - valid.length} файл(ов) пропущено (формат/размер)`);
    setFotos(prev => [...prev, ...valid].slice(0, 12));
  };

  const removeFoto = (i: number) => setFotos(prev => prev.filter((_, idx) => idx !== i));

  // ───────── KI-Extraktion
  const generieren = () => {
    setError(null);
    if (notizen.trim().length < 20) {
      setError("Заметки слишком короткие — минимум 20 символов");
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
  // Akzeptiert auch leeren ai-State — dann mit Notizen als Beschreibung
  // (manueller Modus wenn KI nicht verfügbar oder User KI überspringen will).
  const speichern = () => {
    setError(null);
    if (!preis) { setError("Не указана цена"); return; }

    // Manueller Fallback wenn KI nicht gelaufen: aus Notizen + Default-Name bauen.
    const data = ai ?? {
      name:             notizen.slice(0, 80).split(/[.\n]/)[0].trim() || "Без названия",
      kurzbeschreibung: notizen.slice(0, 160),
      beschreibung:     notizen,
      era:              null,
      herkunft:         null,
      material:         null,
      zustand:          "gut" as const,
      tags:             [],
      seo_titel:        "",
      seo_beschreibung: notizen.slice(0, 140),
      instagram_caption:  "",
      instagram_hashtags: [],
    };
    const isManual = !ai;

    startSave(async () => {
      try {
        setProgress(isManual ? "Создаём товар без ИИ …" : "Создаём товар …");

        // 1. Produkt erstellen via Server Action wäre cleaner, aber FormData-Aufruf
        //    auf existing API ist hier schneller. Wir nutzen direkten DB-Endpoint /api/produkte (POST).
        const erstellenRes = await fetch("/api/produkte", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:             data.name,
            kurzbeschreibung: data.kurzbeschreibung,
            beschreibung:     data.beschreibung,
            preis:            Number(preis),
            waehrung:         waehrung,
            kategorie_id:     kategorie ? Number(kategorie) : undefined,
            zustand:          data.zustand,
            era:              data.era      ?? undefined,
            herkunft:         data.herkunft ?? undefined,
            material:         data.material ?? undefined,
            tags:             data.tags,
            seo_titel:        data.seo_titel        || undefined,
            seo_beschreibung: data.seo_beschreibung || undefined,
            lagerbestand:     1,
            aktiv:            true,
            b2c_mode:         "visible",
          }),
        });
        const produkt = await erstellenRes.json();
        if (!erstellenRes.ok) throw new Error(produkt.error ?? "Не удалось создать товар");

        // 2. Fotos sequentiell hochladen
        for (let i = 0; i < fotos.length; i++) {
          setProgress(`Загружается фото ${i + 1}/${fotos.length} …`);
          const fd = new FormData();
          fd.append("datei", fotos[i]);
          fd.append("produkt_id", produkt.id);
          fd.append("alt_text", `${data.name} — Foto ${i + 1}`);
          const upRes = await fetch("/api/bilder", { method: "POST", body: fd });
          if (!upRes.ok) console.warn("[upload] Foto", i, "fehlgeschlagen");
        }

        setProgress("Готово — переходим к товару …");
        router.push(`/admin/produkte/${produkt.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось сохранить");
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
        <div className="flex items-start gap-3 px-5 py-4"
             style={{
               borderRadius:    "var(--radius-app)",
               background:       "color-mix(in srgb, var(--color-vintage-burgundy) 10%, transparent)",
               border:           "1px solid color-mix(in srgb, var(--color-vintage-burgundy) 30%, transparent)",
             }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-vintage-burgundy)" }} />
          <p className="text-sm font-sans" style={{ color: "var(--color-vintage-burgundy)" }}>{error}</p>
        </div>
      )}

      {/* ─── Block A: Fotos ──────────────────────────────────────────── */}
      <section className="p-6 space-y-4"
               style={{
                 borderRadius: "var(--radius-app)",
                 background:   "var(--color-app-surface)",
                 border:       "1px solid var(--color-line)",
               }}>
        <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <h2 className="font-serif text-lg" style={{ color: "var(--color-ink)" }}>Фотографии</h2>
          <p className="text-xs font-sans" style={{ color: "var(--color-ink-mute)" }}>{fotos.length}/12 · JPG/PNG/WebP · макс. 10 МБ</p>
        </div>

        <label className="block w-full cursor-pointer border-2 border-dashed transition-colors p-8 text-center hover:bg-[var(--color-paper-warm)] hover:border-[var(--color-coral)]"
               style={{ borderRadius: "var(--radius-app)", borderColor: "var(--color-line)" }}>
          <input ref={fileInput} type="file"
                 accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
                 multiple className="sr-only"
                 onChange={(e) => { addFotos(e.target.files); if (fileInput.current) fileInput.current.value = ""; }} />
          <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--color-coral)" }} />
          <p className="text-sm font-sans" style={{ color: "var(--color-ink-soft)" }}>
            Перетащите фотографии сюда или <span className="underline" style={{ color: "var(--color-coral)" }}>выберите</span>
          </p>
        </label>

        {fotos.length > 0 && (
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden"
                   style={{ borderRadius: "var(--radius-app)", background: "var(--color-bone)", border: "1px solid var(--color-line)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeFoto(i)}
                        className="absolute top-1 right-1 p-1 text-white transition-colors"
                        style={{ background: "rgba(15,20,48,0.6)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-vintage-burgundy)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,20,48,0.6)"; }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── Block B: Notizen + Preis + Kategorie ───────────────────── */}
      <section className="p-6 space-y-5"
               style={{
                 borderRadius: "var(--radius-app)",
                 background:   "var(--color-app-surface)",
                 border:       "1px solid var(--color-line)",
               }}>
        <h2 className="font-serif text-lg pb-3" style={{ color: "var(--color-ink)", borderBottom: "1px solid var(--color-line)" }}>
          Заметки и базовые данные
        </h2>

        <Textarea
          tone="app"
          label="Заметки (что это, эпоха, материал, особенности — кратко)"
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          placeholder="напр. Биедермайер комод, около 1840 года, дуб с латунной фурнитурой. Высота 90 см, ширина 110 см. Лёгкая реставрация поверхности, исходные ключи сохранены."
          rows={6}
          hint="Минимум 20 символов. Чем больше деталей, тем лучше результат ИИ."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PreisMultiCurrency
            tone="app"
            label="Цена *"
            name="preis_visual"
            defaultPreis={preis}
            defaultWaehrung={waehrung}
            required
            hint="ИИ не угадывает цену — введите сами"
            onChange={(p, w) => { setPreis(String(p)); setWaehrung(w); }}
          />
          <Select
            tone="app"
            label="Категория"
            options={kategorieOptions}
            value={kategorie}
            onChange={(e) => setKategorie((e.target as HTMLSelectElement).value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={generieren} loading={aiPending}
                  icon={<Wand2 className="w-3.5 h-3.5" />}>
            Сгенерировать с ИИ
          </Button>
          <button
            type="button"
            onClick={speichern}
            disabled={savePending || !preis || notizen.trim().length < 5}
            className="text-[12px] uppercase font-medium px-4 py-2 transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{
              letterSpacing: "0.22em",
              background:    "transparent",
              border:        "1px solid var(--color-ink-mute)",
              color:         "var(--color-ink-soft)",
              borderRadius:  "var(--radius-app)",
              touchAction:   "manipulation",
              minHeight:     40,
            }}
          >
            {savePending && !ai ? "Сохраняется…" : "Без ИИ · Сохранить как есть"}
          </button>
        </div>
      </section>

      {/* ─── Block C: KI-Ergebnis (Review) ──────────────────────────── */}
      {aiPending && (
        <div className="flex items-center justify-center gap-3 p-12" style={{ color: "var(--color-ink-mute)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-sans">ИИ обрабатывает (5–15 секунд) …</span>
        </div>
      )}

      {ai && (
        <>
          <section className="p-6 space-y-5"
                   style={{
                     borderRadius: "var(--radius-app)",
                     background:   "var(--color-app-surface)",
                     border:       "1px solid rgba(232,112,58,0.35)",
                   }}>
            <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: "1px solid var(--color-line)" }}>
              <h2 className="font-serif text-lg flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--color-coral)" }} /> Предложение ИИ — отредактируйте при необходимости
              </h2>
            </div>

            <Input tone="app" label="Название" value={ai.name}
                   onChange={(e) => setAi({ ...ai, name: e.target.value })} />
            <Textarea tone="app" label="Краткое описание" value={ai.kurzbeschreibung} rows={2}
                      onChange={(e) => setAi({ ...ai, kurzbeschreibung: e.target.value })} />
            <Textarea tone="app" label="Подробное описание (Markdown)" value={ai.beschreibung} rows={10}
                      onChange={(e) => setAi({ ...ai, beschreibung: e.target.value })} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input tone="app" label="Эпоха" value={ai.era ?? ""}
                     onChange={(e) => setAi({ ...ai, era: e.target.value })} />
              <Input tone="app" label="Происхождение" value={ai.herkunft ?? ""}
                     onChange={(e) => setAi({ ...ai, herkunft: e.target.value })} />
              <Input tone="app" label="Материал" value={ai.material ?? ""}
                     onChange={(e) => setAi({ ...ai, material: e.target.value })} />
              <Select tone="app" label="Состояние" value={ai.zustand}
                      options={Object.entries(ZUSTAND_LABEL).map(([v,l]) => ({ value: v, label: l }))}
                      onChange={(e) => setAi({ ...ai, zustand: (e.target as HTMLSelectElement).value as AiResult["zustand"] })} />
            </div>

            <Input tone="app" label="Теги (запятая)" value={ai.tags.join(", ")}
                   onChange={(e) => setAi({ ...ai, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} />

            <details className="pt-3" style={{ borderTop: "1px solid var(--color-line)" }}>
              <summary className="cursor-pointer text-xs font-sans uppercase tracking-widest hover:opacity-80" style={{ color: "var(--color-ink-mute)" }}>
                SEO (Заголовок + Описание)
              </summary>
              <div className="space-y-3 pt-3">
                <Input tone="app" label="SEO-заголовок" value={ai.seo_titel} maxLength={70}
                       onChange={(e) => setAi({ ...ai, seo_titel: e.target.value })} />
                <Textarea tone="app" label="SEO-описание" value={ai.seo_beschreibung} maxLength={160} rows={2}
                          onChange={(e) => setAi({ ...ai, seo_beschreibung: e.target.value })} />
              </div>
            </details>
          </section>

          {/* Instagram-Post */}
          <section className="p-6 space-y-4"
                   style={{
                     borderRadius: "var(--radius-app)",
                     background:   "var(--color-app-surface)",
                     border:       "1px solid var(--color-line)",
                   }}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-lg flex items-center gap-2" style={{ color: "#C13584" }}>
                <ImageIcon className="w-4 h-4" /> Instagram-пост
              </h2>
              <button type="button" onClick={copyIg}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-sans tracking-widest uppercase border transition-colors"
                      style={{
                        borderRadius: "var(--radius-app)",
                        borderColor:  copied ? "var(--color-vintage-sage)" : "var(--color-line)",
                        color:        copied ? "var(--color-vintage-sage)" : "var(--color-ink-soft)",
                      }}>
                {copied ? <><Check className="w-3 h-3" /> Скопировано</> : <><Copy className="w-3 h-3" /> Копировать</>}
              </button>
            </div>
            <Textarea tone="app" label="Caption" value={ai.instagram_caption} rows={6}
                      onChange={(e) => setAi({ ...ai, instagram_caption: e.target.value })} />
            <Textarea tone="app" label="Hashtags" value={ai.instagram_hashtags.join(" ")} rows={2}
                      onChange={(e) => setAi({ ...ai, instagram_hashtags: e.target.value.split(/\s+/).filter(Boolean) })} />
          </section>

          {/* Save */}
          <div className="flex items-center justify-between gap-3">
            {progress && (
              <p className="text-sm font-sans flex items-center gap-2" style={{ color: "var(--color-ink-mute)" }}>
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
