"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postCreateAction } from "./actions";

export function JournalNeuFormular() {
  const [, formAction, isPending] = useActionState(postCreateAction, null);
  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Новая публикация
      </summary>
      <form action={formAction} className="mt-5 space-y-4">
        <Input label="Заголовок" name="titel" required />
        <Button type="submit" loading={isPending}>Создать и открыть</Button>
      </form>
    </details>
  );
}
