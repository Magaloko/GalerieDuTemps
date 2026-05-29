"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check, Loader2, Star, Trash2, Plus, Eye, EyeOff, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import {
  produktVollEditAction,
  produktBildUploadAction,
  produktBildLoeschenAction,
  produktHauptbildAction,
  produktBildSortierenAction,
} from "../../actions";
import { haptic } from "../../../fx";

type Zustand = "sehr_gut" | "gut" | "akzeptabel" | "restauriert";
type B2cMode = "visible" | "teaser" | "hidden";

interface ProduktData {
  id: string; slug: string; name: string; artikel_code: string | null;
  preis: number; originalpreis: number | null;
  kurzbeschreibung: string | null; beschreibung: string | null;
  kategorie_id: number | null; zustand: Zustand;
  era: string | null; material: string | null; herkunft: string | null;
  lagerbestand: number; featured: boolean; aktiv: boolean; b2c_mode: B2cMode;
  tags: string[];
}
interface Bild { id: string; url: string; urlFull: string; ist_hauptbild: boolean }

const ZUSTAND_OPT: { v: Zustand; l: string }[] = [
  { v: "sehr_gut", l: "Отличное" }, { v: "gut", l: "Хорошее" },
  { v: "akzeptabel", l: "Приемлемое" }, { v: "restauriert", l: "Реставрировано" },
];

// Häufige Epochen für Schnell-Tap (füllen das Epoche-Feld).
const ERA_PRESETS = ["1920-е", "1930-е", "1950-е", "1960-е", "1970-е", "1980-е", "1990-е"];

export function ProduktEditor({
  produkt, bilder: bilderInit, kategorien,
}: {
  produkt: ProduktData;
  bilder: Bild[];
  kategorien: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<ProduktData>(produkt);
  const [bilder, setBilder] = useState<Bild[]>(bilderInit);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState<{ t: "ok" | "err"; m: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upd = <K extends keyof ProduktData>(k: K, v: ProduktData[K]) => setF(s => ({ ...s, [k]: v }));
  const flashMsg = (t: "ok" | "err", m: string) => { setFlash({ t, m }); setTimeout(() => setFlash(null), 2200); };

  const save = () => start(async () => {
    const r = await produktVollEditAction(f.id, {
      name: f.name,
      preis: f.preis,
      originalpreis: f.originalpreis,
      kurzbeschreibung: f.kurzbeschreibung ?? undefined,
      beschreibung: f.beschreibung ?? undefined,
      kategorie_id: f.kategorie_id,
      zustand: f.zustand,
      era: f.era ?? undefined,
      material: f.material ?? undefined,
      herkunft: f.herkunft ?? undefined,
      lagerbestand: f.lagerbestand,
      featured: f.featured,
      aktiv: f.aktiv,
      b2c_mode: f.b2c_mode,
      tags: f.tags,
    });
    if (r.ok) { haptic("success"); flashMsg("ok", "Сохранено"); router.refresh(); }
    else { haptic("error"); flashMsg("err", r.error); }
  });

  const [uploadProg, setUploadProg] = useState<{ done: number; total: number } | null>(null);

  // Mehrbild-Upload: alle gewählten Dateien nacheinander hochladen (die
  // Upload-Action verarbeitet ein File pro Aufruf). Sequentiell, damit die
  // erste-Bild-=-Hauptbild-Logik serverseitig deterministisch bleibt.
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (e.target) e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProg({ done: i, total: files.length });
      const fd = new FormData();
      fd.set("produktId", f.id);
      fd.set("file", files[i]);
      const r = await produktBildUploadAction(fd);
      if (r.ok) ok++; else fail++;
    }
    setUploadProg(null);
    setUploading(false);
    if (ok > 0) haptic("success");
    if (fail > 0) { haptic("error"); flashMsg("err", `${ok} добавлено, ${fail} с ошибкой`); }
    else flashMsg("ok", ok === 1 ? "Фото добавлено" : `${ok} фото добавлено`);
    router.refresh();
  };

  const delBild = (id: string) => start(async () => {
    const r = await produktBildLoeschenAction(id, f.id);
    if (r.ok) { setBilder(b => b.filter(x => x.id !== id)); haptic("light"); router.refresh(); }
    else flashMsg("err", r.error);
  });
  const setMain = (b: Bild) => start(async () => {
    const r = await produktHauptbildAction(b.id, f.id, b.urlFull);
    if (r.ok) { setBilder(arr => arr.map(x => ({ ...x, ist_hauptbild: x.id === b.id }))); haptic("light"); router.refresh(); }
    else flashMsg("err", r.error);
  });

  // Galerie-Reihenfolge: Bild um eine Position verschieben (optimistisch +
  // persistieren). dir = -1 nach vorne, +1 nach hinten.
  const moveBild = (id: string, dir: -1 | 1) => {
    setBilder(prev => {
      const i = prev.findIndex(b => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      haptic("light");
      start(async () => {
        const r = await produktBildSortierenAction(f.id, next.map(b => b.id));
        if (!r.ok) { flashMsg("err", r.error); router.refresh(); }
      });
      return next;
    });
  };

  const ohnePreis = f.preis <= 1;
  // Pflicht-Führung: was fehlt noch zur Veröffentlichung?
  const fehlt: string[] = [
    bilder.length === 0      ? "Добавьте фото" : null,
    ohnePreis                ? "Укажите цену"  : null,
    f.kategorie_id == null   ? "Выберите категорию" : null,
    !f.name.trim()           ? "Укажите название" : null,
  ].filter(Boolean) as string[];
  const bereitZuVeroeffentlichen = fehlt.length === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase font-medium" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            ✦ {f.artikel_code ?? "Новый"} {f.aktiv ? "· 🟢 активен" : "· черновик"}
          </p>
          {f.aktiv && (
            <Link href={`/tg/produkt/${produkt.slug}`} target="_blank"
              className="inline-flex items-center gap-1 text-[10px] uppercase font-medium shrink-0"
              style={{ letterSpacing: "0.14em", color: "var(--tg-theme-link-color, var(--color-coral))", touchAction: "manipulation" }}>
              <ExternalLink className="w-3 h-3" /> Превью
            </Link>
          )}
        </div>
        <input
          value={f.name}
          onChange={e => upd("name", e.target.value)}
          className="w-full bg-transparent"
          style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--tg-theme-text-color, var(--color-ink))", lineHeight: 1.15, outline: "none" }}
        />
      </div>

      {/* ── Galerie ── */}
      <Section title="Фотографии">
        <div className="grid grid-cols-3 gap-2">
          {bilder.map((b, i) => (
            <div key={b.id} className="relative aspect-square overflow-hidden" style={{ background: "var(--color-bone)", border: b.ist_hauptbild ? "2px solid var(--color-coral)" : "1px solid var(--color-line)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-1 right-1 flex gap-1">
                {!b.ist_hauptbild && (
                  <button type="button" onClick={() => setMain(b)} className="p-1" style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4 }} title="Сделать главным">
                    <Star className="w-3 h-3" style={{ color: "var(--color-ink-mute)" }} />
                  </button>
                )}
                <button type="button" onClick={() => delBild(b.id)} className="p-1" style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4 }}>
                  <Trash2 className="w-3 h-3" style={{ color: "var(--color-coral-deep, #A53E26)" }} />
                </button>
              </div>
              {/* Reihenfolge: ◀ / ▶ (nur wenn mehr als ein Bild) */}
              {bilder.length > 1 && (
                <div className="absolute bottom-1 right-1 flex gap-1">
                  <button type="button" disabled={i === 0} onClick={() => moveBild(b.id, -1)}
                    className="p-0.5 disabled:opacity-30" style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4 }} aria-label="Влево">
                    <ChevronLeft className="w-3 h-3" style={{ color: "var(--color-ink)" }} />
                  </button>
                  <button type="button" disabled={i === bilder.length - 1} onClick={() => moveBild(b.id, 1)}
                    className="p-0.5 disabled:opacity-30" style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4 }} aria-label="Вправо">
                    <ChevronRight className="w-3 h-3" style={{ color: "var(--color-ink)" }} />
                  </button>
                </div>
              )}
              {b.ist_hauptbild && (
                <span className="absolute bottom-1 left-1 text-[8px] uppercase px-1 py-0.5" style={{ background: "var(--color-coral)", color: "#fff", letterSpacing: "0.1em" }}>главное</span>
              )}
            </div>
          ))}
          {/* Upload-Tile (Mehrfachauswahl) */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="aspect-square flex flex-col items-center justify-center gap-1"
            style={{ background: "var(--color-bone)", border: "1px dashed var(--color-line)" }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--color-coral)" }} />
                {uploadProg && (
                  <span className="text-[9px]" style={{ color: "var(--color-ink-mute)" }}>
                    {uploadProg.done + 1}/{uploadProg.total}
                  </span>
                )}
              </>
            ) : (
              <><Plus className="w-5 h-5" style={{ color: "var(--color-coral)" }} /><span className="text-[9px] uppercase" style={{ color: "var(--color-ink-mute)" }}>добавить</span></>
            )}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
      </Section>

      {/* ── Preis ── */}
      <Section title="Цена и наличие">
        <Row>
          <Field label="Цена ₸" type="number" value={f.preis > 1 ? String(f.preis) : ""} onChange={v => upd("preis", parseInt(v || "0", 10))} />
          <Field label="Старая ₸" type="number" value={f.originalpreis ? String(f.originalpreis) : ""} onChange={v => upd("originalpreis", v ? parseInt(v, 10) : null)} />
        </Row>
        <Field label="Остаток" type="number" value={String(f.lagerbestand)} onChange={v => upd("lagerbestand", parseInt(v || "0", 10))} />
        <div>
          <span className="block mb-1 text-[10px] uppercase" style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>Состояние</span>
          <ChipGroup
            options={ZUSTAND_OPT.map(o => ({ v: o.v, l: o.l }))}
            value={f.zustand}
            onPick={v => upd("zustand", v as Zustand)}
          />
        </div>
      </Section>

      {/* ── Описание ── */}
      <Section title="Описание">
        <Field label="Краткое (1 строка)" value={f.kurzbeschreibung ?? ""} onChange={v => upd("kurzbeschreibung", v)} />
        <Textarea label="Полное описание" value={f.beschreibung ?? ""} onChange={v => upd("beschreibung", v)} />
      </Section>

      {/* ── Атрибуты ── */}
      <Section title="Атрибуты">
        <SelectField
          label="Категория"
          value={f.kategorie_id != null ? String(f.kategorie_id) : ""}
          options={[{ v: "", l: "— не выбрана —" }, ...kategorien.map(k => ({ v: String(k.id), l: k.name }))]}
          onChange={v => upd("kategorie_id", v ? parseInt(v, 10) : null)}
        />
        <Row>
          <Field label="Эпоха" value={f.era ?? ""} onChange={v => upd("era", v)} placeholder="1920-е" />
          <Field label="Происхождение" value={f.herkunft ?? ""} onChange={v => upd("herkunft", v)} placeholder="Германия" />
        </Row>
        {/* Schnell-Tap Epochen */}
        <div className="flex flex-wrap gap-1.5">
          {ERA_PRESETS.map(e => {
            const aktiv = (f.era ?? "") === e;
            return (
              <button key={e} type="button" onClick={() => upd("era", aktiv ? "" : e)}
                className="px-2.5 py-1 text-[11px] font-medium"
                style={{
                  borderRadius: 999, touchAction: "manipulation",
                  background: aktiv ? "var(--color-coral)" : "var(--color-bone)",
                  color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
                  border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
                }}>
                {e}
              </button>
            );
          })}
        </div>
        <Field label="Материал" value={f.material ?? ""} onChange={v => upd("material", v)} placeholder="Дуб, латунь" />
        <Field label="Теги (через запятую)" value={f.tags.join(", ")} onChange={v => upd("tags", v.split(",").map(s => s.trim()).filter(Boolean))} />
      </Section>

      {/* ── Видимость ── */}
      <Section title="Витрина">
        <label className="flex items-center justify-between p-3" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)" }}>
          <span className="text-sm" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>⭐ Рекомендуемый (featured)</span>
          <input type="checkbox" checked={f.featured} onChange={e => upd("featured", e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--color-coral)" }} />
        </label>
      </Section>

      {/* Pflicht-Führung: Checkliste was zur Veröffentlichung fehlt (nur Entwurf) */}
      {!f.aktiv && fehlt.length > 0 && (
        <div className="p-3 space-y-1" style={{ background: "rgba(232,112,58,0.06)", border: "1px solid rgba(232,112,58,0.30)" }}>
          <p className="text-[10px] uppercase font-medium" style={{ letterSpacing: "0.18em", color: "var(--color-coral)" }}>
            Для публикации не хватает:
          </p>
          {fehlt.map(x => (
            <p key={x} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-coral-deep, #A53E26)" }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--color-coral)" }} /> {x}
            </p>
          ))}
        </div>
      )}

      {/* Sticky actions */}
      <div className="sticky bottom-0 pt-2 space-y-2" style={{ background: "var(--tg-theme-bg-color, var(--color-paper))" }}>
        {flash && (
          <p className="text-[12px] flex items-center gap-1" style={{ color: flash.t === "ok" ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
            {flash.t === "ok" ? <Check className="w-3.5 h-3.5" /> : null}{flash.m}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={save} className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] uppercase font-medium" style={{ letterSpacing: "0.16em", background: "var(--color-ink)", color: "#fff" }}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Сохранить
          </button>
          {f.aktiv ? (
            <button type="button" disabled={pending} onClick={() => { upd("aktiv", false); upd("b2c_mode", "hidden"); start(async () => { await produktVollEditAction(f.id, { aktiv: false, b2c_mode: "hidden" }); haptic("light"); router.refresh(); }); }}
              className="px-4 py-3 text-[12px] uppercase font-medium" style={{ background: "var(--color-bone)", color: "var(--color-ink-soft)", border: "1px solid var(--color-line)" }}>
              <EyeOff className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" disabled={pending || !bereitZuVeroeffentlichen} onClick={() => start(async () => { const r = await produktVollEditAction(f.id, { ...stripForPublish(f), aktiv: true, b2c_mode: "visible" }); if (r.ok) { upd("aktiv", true); haptic("success"); flashMsg("ok", "Опубликовано"); router.refresh(); } else flashMsg("err", r.error); })}
              className="px-4 py-3 text-[12px] uppercase font-medium disabled:opacity-40" style={{ background: "var(--color-coral)", color: "#fff" }}>
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function stripForPublish(f: ProduktData) {
  return { name: f.name, preis: f.preis, kategorie_id: f.kategorie_id };
}

/* ── Form-Bausteine ── */
function ChipGroup({ options, value, onPick }: {
  options: { v: string; l: string }[]; value: string; onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const aktiv = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onPick(o.v)}
            className="px-2.5 py-1.5 text-[11px] font-medium"
            style={{
              borderRadius: 999, touchAction: "manipulation",
              background: aktiv ? "var(--color-coral)" : "var(--color-bone)",
              color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
              border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
            }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] uppercase font-medium px-1" style={{ letterSpacing: "0.24em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>{title}</p>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[10px] uppercase" style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>{label}</span>
      <input type={type} inputMode={type === "number" ? "numeric" : undefined} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }} />
    </label>
  );
}
function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[10px] uppercase" style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>{label}</span>
      <textarea value={value} rows={4} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm resize-y" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))", minHeight: 90 }} />
    </label>
  );
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[10px] uppercase" style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm" style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}
