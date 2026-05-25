"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
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

        <Input
          label="Название"
          name="name"
          required
          defaultValue={produkt?.name}
          error={e("name")}
          placeholder="напр. Комод бидермейер"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Preis (₸ KZT)"
            name="preis"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={produkt?.preis}
            error={e("preis")}
            placeholder="0.00"
          />
          <Input
            label="Изначальная цена (необязательно)"
            name="originalpreis"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produkt?.originalpreis ?? ""}
            error={e("originalpreis")}
            placeholder="0.00"
            hint="Отображается зачёркнутой"
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

      {/* ─── Beschreibungen ───────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Описания
        </h2>
        <Textarea
          label="Краткое описание"
          name="kurzbeschreibung"
          defaultValue={produkt?.kurzbeschreibung ?? ""}
          error={e("kurzbeschreibung")}
          placeholder="Краткое резюме (макс. 500 символов)"
          maxLength={500}
          rows={3}
        />
        <Textarea
          label="Подробное описание"
          name="beschreibung"
          defaultValue={produkt?.beschreibung ?? ""}
          error={e("beschreibung")}
          placeholder="Подробное описание, история, особенности …"
          rows={8}
        />
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
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="hidden"  name="featured" value="false" />
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
          <form action={loeschenAction}>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3 h-3" />}
              onClick={(e) => {
                if (!confirm(`Удалить "${produkt.name}"? Это действие необратимо.`)) {
                  e.preventDefault();
                }
              }}
            >
              Удалить
            </Button>
          </form>
        )}
      </div>
    </form>
  );
}
