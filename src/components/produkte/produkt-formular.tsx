"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { MultilingualInput } from "@/components/ui/multilingual-input";
import { SingleMediaUpload } from "@/components/ui/single-media-upload";
import { Save, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Produkt } from "@/types/produkt";
import type { Kategorie } from "@/types/produkt";
import type { FormState } from "@/app/(admin)/admin/produkte/actions";

interface ProduktFormularProps {
  produkt?:    Produkt;
  kategorien:  Kategorie[];
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
  action,
  loeschenAction,
}: ProduktFormularProps) {
  const [state, formAction, isPending] = useActionState(action, null);
  const [deletePending, startDelete] = useTransition();
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.message) {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state]);

  const e = (field: string) => state?.errors?.[field]?.[0];

  const kategorieOptions = [
    { value: "", label: "Без категории" },
    ...kategorien.map(k => ({ value: String(k.id), label: k.name })),
  ];

  return (
    <form action={formAction} className="space-y-8">

      {/* ─── Feedback ─────────────────────────────────────────────── */}
      {state?.message && (
        <div
          ref={successRef}
          className="flex items-center gap-3 px-5 py-4 bg-vintage-sage/10 border border-vintage-sage/30"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <CheckCircle2 className="w-4 h-4 text-vintage-sage flex-shrink-0" />
          <p className="text-sm font-sans text-vintage-forest">{state.message}</p>
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
          />
          <Select
            label="Состояние"
            name="zustand"
            required
            options={ZUSTAND_OPTIONS}
            defaultValue={produkt?.zustand ?? "gut"}
            error={e("zustand")}
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

      {/* ─── Preise & Marge ───────────────────────────────────────── */}
      <PreiseSektion produkt={produkt} e={e} />

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

      {/* ─── Bilder & Medien ─────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <div className="flex items-baseline justify-between border-b border-vintage-sand/50 pb-3">
          <h2 className="font-serif text-lg text-vintage-espresso">Изображения и медиа</h2>
          <p className="text-xs font-sans text-vintage-dust">
            Дополнительная галерея — после сохранения
          </p>
        </div>

        <SingleMediaUpload
          label="Главное изображение"
          name="hauptbild_url"
          accept="image/*"
          variant="image"
          defaultValue={produkt?.hauptbild_url ?? ""}
          hint="JPEG, PNG, WebP, AVIF · макс. 10 МБ"
        />

        <SingleMediaUpload
          label="Обратная сторона / деталь (опционально)"
          name="rueckbild_url"
          accept="image/*"
          variant="image"
          defaultValue={produkt?.rueckbild_url ?? ""}
          hint="Второе изображение для детальной страницы"
        />

        <SingleMediaUpload
          label="Видео (опционально)"
          name="video_url"
          accept="video/mp4,video/webm,video/quicktime"
          variant="video"
          defaultValue={produkt?.video_url ?? ""}
          placeholder="https://… .mp4  или  https://youtu.be/…"
          hint="MP4 (макс. 100 МБ) или вставьте URL YouTube/Vimeo"
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

      {/* ─── Aktionen ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <Button
            type="submit"
            loading={isPending}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            {produkt ? "Сохранить" : "Создать товар"}
          </Button>
        </div>

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
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preise & Marge Sektion (eigene Komponente wegen Live-Marge-Berechnung)
// ---------------------------------------------------------------------------
function PreiseSektion({
  produkt,
  e,
}: {
  produkt?: Produkt;
  e:        (field: string) => string | undefined;
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Input
          label="B2C-цена (₸ KZT)"
          name="preis"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={produkt?.preis}
          error={e("preis")}
          placeholder="0.00"
          hint="Видна обычным клиентам"
          onChange={(ev) => setB2c(Number((ev.target as HTMLInputElement).value) || 0)}
        />
        <Input
          label="B2B-цена (опционально)"
          name="b2b_preis"
          type="number"
          step="0.01"
          min="0"
          defaultValue={produkt?.b2b_preis ?? ""}
          error={e("b2b_preis")}
          placeholder="0.00"
          hint="Пусто → B2B видят B2C-цену"
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
