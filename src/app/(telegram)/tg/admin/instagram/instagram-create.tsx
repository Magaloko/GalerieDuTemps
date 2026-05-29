"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Check, ImagePlus, X } from "lucide-react";
import { instagramPostCreateAction, instagramKategorieCreateAction, instagramThumbnailUploadAction } from "../actions";
import { haptic } from "../../fx";

type Option = { value: string; label: string };

/* Neuen Archiv-Post anlegen: Embed/URL einfügen → Kategorie + optional Produkt
 * + optional Titel. Inline „neue Kategorie". */
export function InstagramCreate({
  kategorien, produkte, brands,
}: { kategorien: Option[]; produkte: Option[]; brands: Option[] }) {
  const router = useRouter();
  const [embed, setEmbed]       = useState("");
  const [kat, setKat]           = useState("");
  const [prod, setProd]         = useState("");
  const [brand, setBrand]       = useState("");
  const [titel, setTitel]       = useState("");
  const [neueKat, setNeueKat]   = useState("");
  const [katOffen, setKatOffen] = useState(false);
  const [cover, setCover]       = useState("");           // hochgeladene Cover-URL
  const [coverBusy, setCoverBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start]        = useTransition();
  const [flash, setFlash]       = useState<{ t: "ok" | "err"; m: string } | null>(null);

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setCoverBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const r = await instagramThumbnailUploadAction(fd);
    setCoverBusy(false);
    if (r.ok) { haptic("success"); setCover(r.url); }
    else { haptic("error"); setFlash({ t: "err", m: r.error }); }
  };

  const create = () => start(async () => {
    const r = await instagramPostCreateAction({
      embedOderUrl: embed,
      kategorieId:  kat ? parseInt(kat, 10) : null,
      produktId:    prod || null,
      brandId:      brand || null,
      titel:        titel || null,
      thumbnailUrl: cover || null,
    });
    if (r.ok) {
      haptic("success");
      setFlash({ t: "ok", m: "Добавлено" });
      setEmbed(""); setTitel(""); setProd(""); setBrand(""); setCover("");
      setTimeout(() => { setFlash(null); router.refresh(); }, 900);
    } else {
      haptic("error");
      setFlash({ t: "err", m: r.error });
    }
  });

  const katErstellen = () => start(async () => {
    const r = await instagramKategorieCreateAction(neueKat);
    if (r.ok) { haptic("success"); setNeueKat(""); setKatOffen(false); router.refresh(); }
    else { haptic("error"); setFlash({ t: "err", m: r.error }); }
  });

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bone)", border: "1px solid var(--color-line)",
    color: "var(--tg-theme-text-color, var(--color-ink))",
  };

  return (
    <div className="p-3 space-y-2 mb-4" style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)" }}>
      <textarea
        value={embed}
        onChange={e => setEmbed(e.target.value)}
        rows={3}
        placeholder="Вставьте embed-код или ссылку Instagram…"
        className="w-full px-2.5 py-2 text-sm resize-y"
        style={{ ...inputStyle, minHeight: 72 }}
      />
      <input
        value={titel}
        onChange={e => setTitel(e.target.value)}
        placeholder="Заголовок (необязательно)"
        className="w-full px-2.5 py-2 text-sm"
        style={inputStyle}
      />
      <div className="flex gap-2">
        <select value={kat} onChange={e => setKat(e.target.value)} className="flex-1 px-2.5 py-2 text-sm" style={inputStyle}>
          <option value="">— категория —</option>
          {kategorien.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <button type="button" onClick={() => setKatOffen(o => !o)} className="px-3 py-2 text-[11px] uppercase" style={{ ...inputStyle }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      {katOffen && (
        <div className="flex gap-2">
          <input value={neueKat} onChange={e => setNeueKat(e.target.value)} placeholder="Новая категория" className="flex-1 px-2.5 py-2 text-sm" style={inputStyle} />
          <button type="button" disabled={pending || neueKat.trim().length < 2} onClick={katErstellen}
            className="px-3 py-2 text-[11px] uppercase font-medium disabled:opacity-40" style={{ background: "var(--color-ink)", color: "#fff" }}>
            OK
          </button>
        </div>
      )}
      <select value={prod} onChange={e => setProd(e.target.value)} className="w-full px-2.5 py-2 text-sm" style={inputStyle}>
        <option value="">— товар (необязательно) —</option>
        {produkte.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      <select value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-2.5 py-2 text-sm" style={inputStyle}>
        <option value="">— бренд (необязательно) —</option>
        {brands.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>

      {/* Cover-Bild (optional). Bei verknüpftem Produkt ist es optional — die
          App nutzt sonst automatisch das Produktbild. */}
      <div className="flex items-center gap-2">
        {cover ? (
          <div className="relative shrink-0" style={{ width: 56, height: 70 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="w-full h-full object-cover" style={{ borderRadius: 6, border: "1px solid var(--color-line)" }} />
            <button type="button" onClick={() => setCover("")}
              className="absolute -top-1.5 -right-1.5 p-0.5" style={{ background: "var(--color-ink)", borderRadius: 999 }} aria-label="Удалить обложку">
              <X className="w-3 h-3" style={{ color: "#fff" }} />
            </button>
          </div>
        ) : null}
        <button type="button" disabled={coverBusy} onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] uppercase font-medium disabled:opacity-50"
          style={{ ...inputStyle, letterSpacing: "0.14em" }}>
          {coverBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {cover ? "Заменить обложку" : "Обложка (необязательно)"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onCover} />
      </div>

      {flash && (
        <p className="text-[11px]" style={{ color: flash.t === "ok" ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
          {flash.t === "ok" ? <Check className="w-3 h-3 inline mr-1" /> : null}{flash.m}
        </p>
      )}

      <button type="button" disabled={pending || embed.trim().length < 5} onClick={create}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase font-medium disabled:opacity-40"
        style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff" }}>
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Добавить в архив
      </button>
    </div>
  );
}
