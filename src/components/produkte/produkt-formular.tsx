"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { PreisMultiCurrency } from "./preis-multi-currency";
import { MultilingualInput } from "@/components/ui/multilingual-input";
import { SingleMediaUpload } from "@/components/ui/single-media-upload";
import { BildManager } from "./bild-manager";
import { InstagramUrlsInput } from "./instagram-urls-input";
import { ProduktStoryEditor } from "./produkt-story-editor";
import { Save, Trash2, AlertCircle, CheckCircle2, ImagePlus, Info, Eye } from "lucide-react";
import { InstagramIcon } from "./instagram-icon";
import Image from "next/image";
import { formatPreis } from "@/lib/utils/preis";
import type { Produkt, Produktbild } from "@/types/produkt";
import type { Kategorie } from "@/types/produkt";
import type { FormState } from "@/app/(admin)/admin/produkte/actions";

interface ProduktFormularProps {
  produkt?:    Produkt;
  kategorien:  Kategorie[];
  /** Bestehende Bilder aus produktbilder-Tabelle (nur bei Edit relevant) */
  initialBilder?: Produktbild[];
  action:      (prev: FormState, formData: FormData) => Promise<FormState>;
  loeschenAction?: () => Promise<void>;
}

const ZUSTAND_OPTIONS = [
  { value: "sehr_gut",    label: "Отличное"      },
  { value: "gut",         label: "Хорошее"       },
  { value: "akzeptabel",  label: "Приемлемое"    },
  { value: "restauriert", label: "Реставрировано" },
];

export function ProduktFormular({
  produkt,
  kategorien,
  initialBilder = [],
  action,
  loeschenAction,
}: ProduktFormularProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [deletePending, startDelete] = useTransition();
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Created-Toast: nach Redirect von /produkte/neu → /produkte/[id]?created=1
  const [createdToast, setCreatedToast] = useState(searchParams.get("created") === "1");

  // ?created=1 nach 4s aus URL strippen damit Reload nicht wieder triggered
  useEffect(() => {
    if (!createdToast) return;
    const t = window.setTimeout(() => {
      setCreatedToast(false);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete("created");
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [createdToast, pathname, router, searchParams]);

  // Save-Animation: kurzer „✓ Сохранено" Flash nach erfolgreichem Save
  // (Pulsate für 2.5s, dann zurück zum neutral state)
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (state?.message && state?.savedAt) {
      setJustSaved(true);
      const t = window.setTimeout(() => setJustSaved(false), 2500);
      return () => window.clearTimeout(t);
    }
  }, [state?.message, state?.savedAt]);

  const e = (field: string) => state?.errors?.[field]?.[0];

  const kategorieOptions = [
    { value: "", label: "Без категории" },
    ...kategorien.map(k => ({ value: String(k.id), label: k.name })),
  ];

  // ── Live-Vorschau-State (wie im Newsletter-Editor) ───────────────────────
  // Spiegelt Name + Preis live; Hauptbild kommt aus den bereits gespeicherten
  // Bildern (aktualisiert sich nach Upload beim Reload).
  const [pvName, setPvName] = useState(produkt?.name ?? "");
  const [pvPreis, setPvPreis] = useState<number>(Number(produkt?.preis ?? 0));
  const [pvKatId, setPvKatId] = useState<string>(String(produkt?.kategorie_id ?? ""));
  const [pvZustand, setPvZustand] = useState<string>(produkt?.zustand ?? "gut");
  const [pvEra, setPvEra] = useState<string>(produkt?.era ?? "");
  const pvWaehrung = (produkt?.waehrung as "KZT"|"EUR"|"USD"|"RUB"|undefined) ?? "KZT";
  const pvKatName = kategorien.find(k => String(k.id) === pvKatId)?.name ?? null;
  const pvBild =
    initialBilder.find(b => b.ist_hauptbild)?.url ??
    initialBilder[0]?.url ??
    produkt?.hauptbild_url ??
    null;

  // Zustand-Anzeige (Label + Farbe, wie in ProduktKarte).
  const ZUSTAND_PV: Record<string, { label: string; color: string }> = {
    sehr_gut:    { label: "Отличное",       color: "#7A8B6F" },
    gut:         { label: "Хорошее",        color: "#B08D57" },
    akzeptabel:  { label: "Приемлемое",     color: "#C9956B" },
    restauriert: { label: "Реставрировано", color: "#8B6F47" },
  };
  const pvZ = ZUSTAND_PV[pvZustand];

  return (
    <form action={formAction} className="space-y-8">

      {/* ─── Created-Toast (nach Erstellen) ──────────────────────── */}
      {createdToast && (
        <div
          className="flex items-center gap-3 px-5 py-4 transition-all"
          style={{
            background:   "rgba(127,140,90,0.12)",
            border:       "1px solid rgba(127,140,90,0.45)",
            borderLeft:   "4px solid #7F8C5A",
            borderRadius: "var(--radius-card)",
            color:        "#52663F",
          }}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-sans">
            <strong>Товар создан.</strong>{" "}
            Загрузите фото ниже — после сохранения они станут доступны на сайте.
          </p>
        </div>
      )}

      {state?.errors && Object.keys(state.errors).length > 0 && (
        <div
          className="flex items-start gap-3 px-5 py-4 bg-vintage-burgundy/10 border border-vintage-burgundy/30"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <AlertCircle className="w-4 h-4 text-vintage-burgundy flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-sans text-vintage-burgundy font-medium mb-1">
              Пожалуйста, исправьте ошибки:
            </p>
            <ul className="text-xs text-vintage-burgundy space-y-0.5">
              {Object.entries(state.errors).map(([field, msgs]) =>
                msgs?.map((msg, i) => (
                  <li key={`${field}-${i}`}>• {msg}</li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* ── 2-Spalten: links Felder, rechts Live-Vorschau (wie Newsletter-Editor) ── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-8 min-w-0">

      {/* ─── Basisinformationen ───────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Основная информация
        </h2>

        <MultilingualInput
          label="Название"
          name="name_i18n"
          variant="input"
          initial={produkt?.name_i18n ?? {}}
          fallbackValue={produkt?.name}
          maxLength={300}
          placeholder="напр. Комод бидермейер"
          onChange={(v) => setPvName(v.ru || v.en || v.de || "")}
        />
        {/* Hidden default-Sprache (ru) für name-Spalte fallback */}
        <input type="hidden" name="name" value={produkt?.name ?? ""} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Slug (URL)"
            name="slug"
            defaultValue={produkt?.slug ?? ""}
            error={e("slug")}
            placeholder="оставьте пустым → создаётся автоматически"
            hint="Создаётся из названия. Можно отредактировать вручную."
          />
          <Input
            label="Артикул-код"
            name="artikel_code"
            defaultValue={produkt?.artikel_code ?? ""}
            error={e("artikel_code")}
            placeholder="оставьте пустым → V-0001, V-0002 …"
            hint="Создаётся автоматически по очереди. Можно перезаписать."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Категория"
            name="kategorie_id"
            options={kategorieOptions}
            defaultValue={String(produkt?.kategorie_id ?? "")}
            error={e("kategorie_id")}
            onChange={(ev) => setPvKatId((ev.target as HTMLSelectElement).value)}
          />
          <Select
            label="Состояние"
            name="zustand"
            required
            options={ZUSTAND_OPTIONS}
            defaultValue={produkt?.zustand ?? "gut"}
            error={e("zustand")}
            onChange={(ev) => setPvZustand((ev.target as HTMLSelectElement).value)}
          />
        </div>

        <Input
          label="Количество на складе"
          name="lagerbestand"
          type="number"
          min="0"
          defaultValue={produkt?.lagerbestand ?? 1}
          error={e("lagerbestand")}
        />
      </section>

      {/* ─── Fotos (foto-first: direkt nach den Basis-Infos) ──────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-vintage-gold" />
            Фотографии
          </h2>
          {produkt && (
            <p className="text-xs font-sans text-vintage-dust">
              {initialBilder.length} {initialBilder.length === 1 ? "фото" : "фото"}
            </p>
          )}
        </div>

        {produkt ? (
          <BildManager produktId={produkt.id} initialBilder={initialBilder} />
        ) : (
          <div
            className="flex items-start gap-3 p-4"
            style={{
              background:   "rgba(201,168,76,0.08)",
              border:       "1px solid rgba(201,168,76,0.30)",
              borderLeft:   "4px solid var(--color-gold, #C9A84C)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-gold, #C9A84C)" }} />
            <div className="text-sm text-vintage-ink font-sans flex-1">
              <p>
                <strong>Сначала сохрани товар</strong> — после этого откроется галерея с
                функциями: drag-sort, главное фото, alt-тексты, массовое удаление, paste из буфера.
              </p>
              <p className="text-xs text-vintage-dust mt-1">
                Все фото обрабатываются автоматически: WebP-варианты, EXIF-strip, сжатие.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ─── Preise & Marge ───────────────────────────────────────── */}
      <PreiseSektion produkt={produkt} e={e} onPreisChange={setPvPreis} />

      {/* ─── Beschreibungen ───────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Описания
        </h2>
        <MultilingualInput
          label="Краткое описание"
          name="kurzbeschreibung_i18n"
          variant="textarea"
          initial={produkt?.kurzbeschreibung_i18n ?? {}}
          fallbackValue={produkt?.kurzbeschreibung ?? undefined}
          rows={3}
          maxLength={500}
          placeholder="Краткое резюме (макс. 500 символов)"
        />
        <MultilingualInput
          label="Подробное описание"
          name="beschreibung_i18n"
          variant="markdown"
          initial={produkt?.beschreibung_i18n ?? {}}
          fallbackValue={produkt?.beschreibung ?? undefined}
          rows={10}
          placeholder="Подробное описание, история, особенности …"
        />
        {/* Hidden-Felder für Backwards-Compat (Action liest auch i18n) */}
        <input type="hidden" name="kurzbeschreibung" value={produkt?.kurzbeschreibung ?? ""} />
        <input type="hidden" name="beschreibung"     value={produkt?.beschreibung ?? ""} />
      </section>

      {/* ─── Story-Blöcke (block-basierte Detail-Beschreibung) ───────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso">История товара</h2>
          <p className="text-xs font-sans text-vintage-dust">Опционально · блоки: текст, фото, цитата</p>
        </div>
        <p className="text-xs text-vintage-dust font-sans">
          Соберите страницу товара из блоков (как рассылку): палитра, живой
          предпросмотр, свойства. Если оставить пустым — показывается обычное
          описание выше.
        </p>
        <ProduktStoryEditor initial={produkt?.inhalt_blocks ?? []} galerie={initialBilder} />
      </section>

      {/* ─── Details ──────────────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Детали
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Эпоха"
            name="era"
            defaultValue={produkt?.era ?? ""}
            placeholder="напр. 1920-е, ар-деко"
            onChange={(ev) => setPvEra((ev.target as HTMLInputElement).value)}
          />
          <Input
            label="Происхождение"
            name="herkunft"
            defaultValue={produkt?.herkunft ?? ""}
            placeholder="напр. Германия, Франция"
          />
          <Input
            label="Материал"
            name="material"
            defaultValue={produkt?.material ?? ""}
            placeholder="напр. дуб, латунь, фарфор"
          />
        </div>
        <Input
          label="Теги"
          name="tags"
          defaultValue={produkt?.tags?.join(", ") ?? ""}
          placeholder="винтаж, антиквариат, ар-деко (через запятую)"
          hint="Ключевые слова через запятую для поиска"
        />
      </section>

      {/* ─── Sichtbarkeit ─────────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Видимость
        </h2>

        {/* Master-Aktiv-Switch */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="hidden" name="aktiv" value="false" />
          <input
            type="checkbox"
            name="aktiv"
            value="true"
            defaultChecked={produkt?.aktiv ?? true}
            className="w-4 h-4 mt-0.5 accent-vintage-sage"
          />
          <span className="text-sm font-sans text-vintage-ink">
            <strong>Активен</strong> — виден и доступен в магазине.
            <span className="block text-xs text-vintage-dust">
              Если выключено, товар нигде не отображается (мастер-выключатель).
            </span>
          </span>
        </label>

        {/* B2C-Sichtbarkeits-Tri-State */}
        <fieldset className="space-y-2 pt-2 border-t border-vintage-sand/40">
          <legend className="text-xs font-sans uppercase tracking-widest text-vintage-brown mb-2">
            B2C-видимость
          </legend>
          {[
            {
              value: "visible",
              title: "Виден",
              desc:  "Клиенты видят товар с ценой и могут купить. (По умолчанию)",
            },
            {
              value: "teaser",
              title: "Витрина",
              desc:  "Клиенты видят товар (фото, описание), но без цены. Для регистрации как «студия».",
            },
            {
              value: "hidden",
              title: "Скрыт",
              desc:  "Товар не отображается в публичном каталоге. Только админ-доступ.",
            },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="b2c_mode"
                value={opt.value}
                defaultChecked={(produkt?.b2c_mode ?? "visible") === opt.value}
                className="w-4 h-4 mt-0.5 accent-vintage-gold"
              />
              <span className="text-sm font-sans text-vintage-ink">
                <strong>{opt.title}</strong>
                <span className="block text-xs text-vintage-dust">{opt.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {/* Featured + Verkauft */}
        <div className="flex flex-wrap gap-6 pt-2 border-t border-vintage-sand/40">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="hidden" name="featured" value="false" />
            <input
              type="checkbox"
              name="featured"
              value="true"
              defaultChecked={produkt?.featured ?? false}
              className="w-4 h-4 accent-vintage-gold"
            />
            <span className="text-sm font-sans text-vintage-ink">
              Рекомендуемое (главная страница)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="hidden" name="verkauft" value="false" />
            <input
              type="checkbox"
              name="verkauft"
              value="true"
              defaultChecked={produkt?.verkauft ?? false}
              className="w-4 h-4 accent-vintage-burgundy"
            />
            <span className="text-sm font-sans text-vintage-ink">
              Отметить как проданное
            </span>
          </label>
        </div>
      </section>

      {/* ─── Abmessungen & Versand ──────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso">Размеры и доставка</h2>
          <p className="text-xs font-sans text-vintage-dust">Опционально · для расчёта доставки</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Ширина (см)"
            name="abmessungen_breite"
            type="number" step="0.1" min="0"
            defaultValue={produkt?.abmessungen?.breite ?? ""}
            placeholder="0"
          />
          <Input
            label="Высота (см)"
            name="abmessungen_hoehe"
            type="number" step="0.1" min="0"
            defaultValue={produkt?.abmessungen?.hoehe ?? ""}
            placeholder="0"
          />
          <Input
            label="Глубина (см)"
            name="abmessungen_tiefe"
            type="number" step="0.1" min="0"
            defaultValue={produkt?.abmessungen?.tiefe ?? ""}
            placeholder="0"
          />
          <Input
            label="Вес (кг)"
            name="abmessungen_gewicht"
            type="number" step="0.01" min="0"
            defaultValue={produkt?.abmessungen?.gewicht ?? ""}
            placeholder="0.00"
          />
        </div>
      </section>

      {/* ─── Видео (опционально) ─────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso">Видео</h2>
          <p className="text-xs font-sans text-vintage-dust">Опционально · 1 видео на товар</p>
        </div>

        <SingleMediaUpload
          label="Видео-обзор товара"
          name="video_url"
          accept="video/mp4,video/webm,video/quicktime"
          variant="video"
          defaultValue={produkt?.video_url ?? ""}
          placeholder="https://… .mp4  или  https://youtu.be/…"
          hint="MP4 (макс. 100 МБ) или URL YouTube/Vimeo"
        />
      </section>

      {/* ─── Instagram-Embeds (опционально) ───────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-3"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso flex items-center gap-2">
            <InstagramIcon className="w-4 h-4" style={{ color: "#C13584" }} />
            Instagram
          </h2>
          <p className="text-xs font-sans text-vintage-dust">Reels и посты · до 5 на товар</p>
        </div>
        <p className="text-xs text-vintage-dust font-sans">
          Скопируй ссылку с reel или поста (либо весь embed-код прямо из Instagram).
          Будет показано на странице товара как нативный embed.
        </p>
        <InstagramUrlsInput
          name="instagram_urls"
          defaultValue={produkt?.instagram_urls ?? []}
        />
      </section>

      {/* ─── SEO ──────────────────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          SEO
        </h2>
        <Input
          label="SEO-заголовок"
          name="seo_titel"
          defaultValue={produkt?.seo_titel ?? ""}
          placeholder="макс. 70 символов"
          maxLength={70}
          hint="Если пусто — используется название товара"
        />
        <Textarea
          label="SEO-описание"
          name="seo_beschreibung"
          defaultValue={produkt?.seo_beschreibung ?? ""}
          placeholder="макс. 160 символов"
          maxLength={160}
          rows={3}
        />
      </section>

        </div>{/* /linke Spalte (Felder) */}

        {/* ── Live-Vorschau (sticky, Desktop) ── */}
        <aside className="hidden lg:block lg:sticky lg:top-6 space-y-2">
          <div
            className="overflow-hidden bg-vintage-white border border-vintage-sand"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <div className="relative w-full" style={{ aspectRatio: "4/5", background: "var(--color-paper-warm, #E8DFD0)" }}>
              {pvBild ? (
                <Image src={pvBild} alt="" fill sizes="320px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-vintage-dust">
                  <ImagePlus className="w-6 h-6 opacity-40" />
                  <span className="text-[11px] uppercase tracking-widest">Нет фото</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-vintage-dust mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Предпросмотр
              </p>
              {pvKatName && (
                <p className="text-[10px] uppercase font-medium truncate" style={{ letterSpacing: "0.18em", color: "var(--color-coral)" }}>
                  {pvKatName}
                </p>
              )}
              <p className="font-serif text-base text-vintage-ink line-clamp-2 mt-0.5">
                {pvName || "Без названия"}
              </p>
              <p className="font-serif text-lg text-vintage-ink mt-1">
                {pvPreis > 0 ? formatPreis(pvPreis, pvWaehrung) : "—"}
              </p>
              {/* Zustand + Эпоха (wie im Footer der ProduktKarte) */}
              <div className="mt-2 pt-2 flex items-center justify-between gap-2" style={{ borderTop: "1px dashed rgba(176,141,87,0.25)" }}>
                {pvZ && (
                  <span className="flex items-center gap-1.5 text-[11px]" style={{ color: pvZ.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: pvZ.color }} />
                    {pvZ.label}
                  </span>
                )}
                {pvEra.trim() && (
                  <span className="text-[11px] truncate" style={{ color: "var(--color-ink-mute, #998)" }}>
                    {pvEra}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-vintage-dust px-1 leading-snug">
            Так карточка появится в каталоге. Фото обновляется после загрузки.
          </p>
        </aside>
      </div>{/* /Grid */}

      {/* ─── Sticky Save-Bar ─────────────────────────────────────────
          Bleibt am unteren Rand sichtbar während des Scrollens — Admin sieht
          immer Save-Button + Status. Auto-Flash bei erfolgreichem Save. */}
      <div
        className="sticky bottom-0 z-30 -mx-6 sm:-mx-0 mt-8 px-6 sm:px-6 py-4"
        style={{
          background:   "rgba(253,250,245,0.96)",
          backdropFilter: "blur(8px)",
          borderTop:    "1px solid var(--color-line, #C9B89A)",
          borderRadius: "var(--radius-card) var(--radius-card) 0 0",
          boxShadow:    justSaved
            ? "0 -2px 12px rgba(127,140,90,0.40), 0 -1px 24px rgba(127,140,90,0.20)"
            : "0 -2px 12px rgba(15,20,48,0.08)",
          transition:   "box-shadow 0.4s ease",
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status-Anzeige links */}
          <div className="flex items-center gap-2 min-h-[28px]">
            {justSaved ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-sans transition-all"
                style={{
                  background:    "#7F8C5A",
                  color:         "#FFFFFF",
                  borderRadius:  "var(--radius-vintage)",
                  letterSpacing: "0.12em",
                  animation:     "savedPulse 0.4s ease-out",
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Сохранено
              </div>
            ) : isPending ? (
              <span className="text-xs font-sans text-vintage-dust flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--color-coral)" }}
                />
                Сохраняется…
              </span>
            ) : state?.savedAt ? (
              <span className="text-xs font-sans text-vintage-dust">
                Сохранено {new Date(state.savedAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : produkt ? (
              <span className="text-xs font-sans text-vintage-dust italic">
                Изменения не сохранены автоматически
              </span>
            ) : (
              <span className="text-xs font-sans text-vintage-dust italic">
                Заполните форму и нажмите «Создать»
              </span>
            )}
          </div>

          {/* Buttons rechts */}
          <div className="flex items-center gap-3">
            {produkt && loeschenAction && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={deletePending}
                icon={<Trash2 className="w-3 h-3" />}
                onClick={() => {
                  if (!confirm(`Удалить "${produkt.name}"? Это действие необратимо.`)) return;
                  startDelete(async () => { await loeschenAction(); });
                }}
              >
                Удалить
              </Button>
            )}

            {/* Save-Button — coral statt gold für besseren Kontrast */}
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 font-sans uppercase transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background:    "var(--color-coral)",
                color:         "#FFFFFF",
                padding:       "10px 22px",
                fontSize:      13,
                letterSpacing: "0.18em",
                fontWeight:    500,
                borderRadius:  "var(--radius-button)",
                boxShadow:     "0 1px 3px rgba(232,112,58,0.40)",
              }}
            >
              {isPending ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {produkt ? "Сохранить" : "Создать товар"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes savedPulse {
          0%   { transform: scale(0.92); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preise & Marge Sektion (eigene Komponente wegen Live-Marge-Berechnung)
// ---------------------------------------------------------------------------
function PreiseSektion({
  produkt,
  e,
  onPreisChange,
}: {
  produkt?: Produkt;
  e:        (field: string) => string | undefined;
  onPreisChange?: (p: number) => void;
}) {
  const [einkauf, setEinkauf] = useState<number>(Number(produkt?.einkaufspreis ?? 0));
  const [b2c,     setB2c]     = useState<number>(Number(produkt?.preis ?? 0));

  const marge = b2c > 0 && einkauf > 0
    ? Math.round(((b2c - einkauf) / b2c) * 100)
    : null;

  return (
    <section
      className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
        <h2 className="font-serif text-lg text-vintage-espresso">Цены и маржа</h2>
        <p className="text-xs font-sans text-vintage-dust">
          Все цены нетто · НДС добавляется в зависимости от страны
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Закупочная цена (нетто)"
          name="einkaufspreis"
          type="number"
          step="0.01"
          min="0"
          defaultValue={produkt?.einkaufspreis ?? ""}
          error={e("einkaufspreis")}
          placeholder="0.00"
          hint="Внутреннее, для расчёта маржи"
          onChange={(ev) => setEinkauf(Number((ev.target as HTMLInputElement).value) || 0)}
        />
        <PreisMultiCurrency
          label="Цена"
          name="preis"
          waehrungName="waehrung"
          defaultPreis={produkt?.preis}
          defaultWaehrung={produkt?.waehrung ?? "KZT"}
          required
          error={e("preis")}
          hint="Видна клиентам · автоконвертация в другие валюты"
          onChange={(p) => { setB2c(p); onPreisChange?.(p); }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Изначальная цена (зачёркнутая)"
          name="originalpreis"
          type="number"
          step="0.01"
          min="0"
          defaultValue={produkt?.originalpreis ?? ""}
          error={e("originalpreis")}
          placeholder="0.00"
          hint="Для отображения скидки"
        />
        <div className="flex items-end">
          <div
            className="w-full px-4 py-2.5 bg-vintage-parchment border border-vintage-sand text-sm font-sans text-vintage-ink"
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <span className="text-xs uppercase tracking-widest text-vintage-dust block mb-1">
              Маржа
            </span>
            {marge !== null ? (
              <span className={marge >= 50 ? "text-vintage-sage font-serif text-lg" : marge >= 20 ? "text-vintage-gold font-serif text-lg" : "text-vintage-burgundy font-serif text-lg"}>
                {marge} %
              </span>
            ) : (
              <span className="text-vintage-dust text-sm">—</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
