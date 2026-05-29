"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brandErstellenAction } from "./actions";

export function NewBrandForm() {
  const [state, formAction, isPending] = useActionState(brandErstellenAction, null);

  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Новый бренд
      </summary>
      <form action={formAction} className="mt-5 space-y-4">
        <Input label="Название" name="name" required placeholder="Например: Christian Dior" />
        <Input label="Slug (URL, необязательно)" name="slug" placeholder="christian-dior" hint="Пусто = сгенерируется из названия" />
        {state?.fehler && <p className="text-xs text-vintage-burgundy">{state.fehler}</p>}
        <Button type="submit" loading={isPending}>Создать и открыть</Button>
      </form>
    </details>
  );
}
