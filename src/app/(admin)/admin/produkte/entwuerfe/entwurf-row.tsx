"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, Loader2, Trash2, Rocket } from "lucide-react";
import {
  entwurfKiFuellenAction,
  entwurfVeroeffentlichenAction,
  entwurfFeldAction,
  entwurfLoeschenAction,
} from "@/app/(admin)/admin/produkte/actions";

interface Entwurf {
  id:          string;
  name:        string;
  hasNotizen:  boolean;
  preis:       number;
  waehrung:    string;
  kategorieId: string;
  zustand:     string;
  bildUrl:     string | null;
}

const ZUSTAND = [
  { value: "sehr_gut", label: "Отличное" },
  { value: "gut", label: "Хорошее" },
  { value: "akzeptabel", label: "Приемлемое" },
  { value: "restauriert", label: "Реставрировано" },
];
const fieldCls = "px-2 py-1.5 text-sm bg-vintage-parchment border border-vintage-sand text-vintage-ink";

export function EntwurfRowClient({
  entwurf, katOptions,
}: {
  entwurf:    Entwurf;
  katOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [preis, setPreis]       = useState(entwurf.preis > 1 ? String(entwurf.preis) : "");
  const [katId, setKatId]       = useState(entwurf.kategorieId);
  const [zustand, setZustand]   = useState(entwurf.zustand);
  const [pending, start]        = useTransition();
  const [flash, setFlash]       = useState<string | null>(null);
  const [gone, setGone]         = useState(false);

  if (gone) return null;

  const ok = (msg = "✓") => { setFlash(msg); setTimeout(() => setFlash(null), 1800); };
  const fail = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };

  const speichern = () => start(async () => {
    const r = await entwurfFeldAction(entwurf.id, {
      preis: preis ? parseInt(preis, 10) : undefined,
      kategorie_id: katId ? Number(katId) : null,
      zustand,
    });
    r.ok ? ok("Сохранено") : fail(r.error ?? "Ошибка");
  });

  const kiFuellen = () => start(async () => {
    const r = await entwurfKiFuellenAction(entwurf.id);
    if (r.ok) { ok("ИИ заполнил ✓"); router.refresh(); } else fail(r.error ?? "Ошибка ИИ");
  });

  const veroeffentlichen = () => start(async () => {
    // Felder zuerst sichern (Preis!), dann publizieren.
    await entwurfFeldAction(entwurf.id, {
      preis: preis ? parseInt(preis, 10) : undefined,
      kategorie_id: katId ? Number(katId) : null,
      zustand,
    });
    const r = await entwurfVeroeffentlichenAction(entwurf.id);
    if (r.ok) { setGone(true); router.refresh(); } else fail(r.error ?? "Ошибка");
  });

  const loeschen = () => {
    if (!confirm("Удалить черновик безвозвратно?")) return;
    start(async () => {
      const r = await entwurfLoeschenAction(entwurf.id);
      if (r.ok) setGone(true); else fail(r.error ?? "Ошибка");
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-card)" }}>
      {/* Thumbnail */}
      <div className="w-full sm:w-24 h-24 shrink-0 overflow-hidden" style={{ background: "var(--color-bone)" }}>
        {entwurf.bildUrl
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={entwurf.bildUrl} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-vintage-dust text-[10px]">нет фото</div>}
      </div>

      {/* Felder */}
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm font-serif text-vintage-espresso truncate" title={entwurf.name}>{entwurf.name}</p>
        <div className="flex flex-wrap gap-2">
          <input type="number" inputMode="numeric" value={preis} onChange={e => setPreis(e.target.value)}
            placeholder={`Цена ${entwurf.waehrung}`} className={`${fieldCls} w-28`} />
          <select value={katId} onChange={e => setKatId(e.target.value)} className={fieldCls}>
            <option value="">Без категории</option>
            {katOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={zustand} onChange={e => setZustand(e.target.value)} className={fieldCls}>
            {ZUSTAND.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
          </select>
          <button type="button" onClick={speichern} disabled={pending}
            className="px-2.5 py-1.5 text-xs border border-vintage-sand text-vintage-dust hover:bg-vintage-parchment transition-colors" style={{ borderRadius: "var(--radius-vintage)" }}>
            Сохранить
          </button>
        </div>
        {flash && (
          <p className="text-[11px] flex items-center gap-1" style={{ color: flash.includes("✓") || flash === "Сохранено" ? "#52663F" : "var(--color-coral-deep,#A53E26)" }}>
            {(flash.includes("✓") || flash === "Сохранено") && <Check className="w-3 h-3" />}{flash}
          </p>
        )}
      </div>

      {/* Aktionen */}
      <div className="flex sm:flex-col gap-2 shrink-0">
        <button type="button" onClick={kiFuellen} disabled={pending || !entwurf.hasNotizen}
          title={entwurf.hasNotizen ? "ИИ заполнит поля из заметок" : "Слишком мало текста для ИИ"}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-vintage-gold/50 text-vintage-gold hover:bg-vintage-gold/10 transition-colors disabled:opacity-40"
          style={{ borderRadius: "var(--radius-vintage)" }}>
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} ИИ
        </button>
        <button type="button" onClick={veroeffentlichen} disabled={pending}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium disabled:opacity-40"
          style={{ background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-vintage)" }}>
          <Rocket className="w-3.5 h-3.5" /> Опубликовать
        </button>
        <button type="button" onClick={loeschen} disabled={pending}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-vintage-burgundy/40 text-vintage-burgundy hover:bg-vintage-burgundy/10 transition-colors"
          style={{ borderRadius: "var(--radius-vintage)" }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
