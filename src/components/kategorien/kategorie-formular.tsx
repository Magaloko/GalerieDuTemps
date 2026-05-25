"use client";

import { useActionState, useEffect, useRef } from "react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select }   from "@/components/ui/select";
import { Button }   from "@/components/ui/button";
import { Save, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Kategorie } from "@/types/produkt";
import type { FormState } from "@/app/(admin)/admin/kategorien/actions";

interface Props {
  kategorie?:        Kategorie;
  elternKandidaten:  Kategorie[];
  action:            (prev: FormState, formData: FormData) => Promise<FormState>;
  loeschenAction?:   () => Promise<void>;
}

export function KategorieFormular({
  kategorie,
  elternKandidaten,
  action,
  loeschenAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.message) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const e = (field: string) => state?.errors?.[field]?.[0];

  const elternOptions = [
    { value: "", label: "— Без родителя (верхний уровень) —" },
    ...elternKandidaten
      .filter(k => k.id !== kategorie?.id)
      .map(k => ({ value: String(k.id), label: `${k.code ? `${k.code} · ` : ""}${k.name}` })),
  ];

  return (
    <form action={formAction} className="space-y-6">
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
          <ul className="text-xs text-vintage-burgundy space-y-0.5">
            {Object.entries(state.errors).map(([field, msgs]) =>
              msgs?.map((msg, i) => <li key={`${field}-${i}`}>• {msg}</li>)
            )}
          </ul>
        </div>
      )}

      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Основная информация
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-4">
          <Input
            label="Код"
            name="code"
            defaultValue={kategorie?.code ?? ""}
            placeholder="01"
            maxLength={10}
            error={e("code")}
            hint="Опц."
          />
          <Input
            label="Название"
            name="name"
            required
            defaultValue={kategorie?.name}
            error={e("name")}
            placeholder="напр. Мебель"
          />
        </div>

        <Input
          label="Slug (URL)"
          name="slug"
          defaultValue={kategorie?.slug ?? ""}
          error={e("slug")}
          placeholder="moebel"
          hint="Автоматически из названия, можно изменить"
        />

        <Select
          label="Родительская категория"
          name="eltern_id"
          options={elternOptions}
          defaultValue={String(kategorie?.eltern_id ?? "")}
          error={e("eltern_id")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Сортировка"
            name="sortierung"
            type="number"
            min="0"
            defaultValue={kategorie?.sortierung ?? 0}
            error={e("sortierung")}
            hint="Меньше = выше в списке"
          />
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer pb-2.5">
              <input type="hidden" name="aktiv" value="false" />
              <input
                type="checkbox"
                name="aktiv"
                value="true"
                defaultChecked={kategorie?.aktiv ?? true}
                className="w-4 h-4 accent-vintage-sage"
              />
              <span className="text-sm font-sans text-vintage-ink">
                Активна (видна в каталоге)
              </span>
            </label>
          </div>
        </div>

        <Textarea
          label="Описание"
          name="beschreibung"
          defaultValue={kategorie?.beschreibung ?? ""}
          error={e("beschreibung")}
          placeholder="Краткое описание категории …"
          rows={3}
        />
      </section>

      <div className="flex items-center justify-between pt-2">
        <Button type="submit" loading={isPending} icon={<Save className="w-3.5 h-3.5" />}>
          {kategorie ? "Сохранить" : "Создать категорию"}
        </Button>

        {kategorie && loeschenAction && (
          <form action={loeschenAction}>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-3 h-3" />}
              onClick={(ev) => {
                const msg = (kategorie.anzahl ?? 0) > 0
                  ? `У категории "${kategorie.name}" есть товары. Будет деактивирована (soft-delete). Продолжить?`
                  : `Удалить категорию "${kategorie.name}"? Это действие необратимо.`;
                if (!confirm(msg)) ev.preventDefault();
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
