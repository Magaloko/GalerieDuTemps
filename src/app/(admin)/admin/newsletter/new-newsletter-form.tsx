"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { newsletterCreateAction } from "./actions";

export function NewNewsletterForm() {
  const [, formAction, isPending] = useActionState(newsletterCreateAction, null);

  return (
    <details className="bg-vintage-white border border-vintage-sand p-5" style={{ borderRadius: "var(--radius-card)" }}>
      <summary className="font-serif text-vintage-espresso cursor-pointer flex items-center gap-2">
        <Plus className="w-4 h-4 text-vintage-gold" /> Neuen Newsletter
      </summary>
      <form action={formAction} className="mt-5 space-y-4">
        <Input label="Interner Titel" name="titel" required placeholder="Sommer-Newsletter 2026" />
        <Input label="Betreff (E-Mail)" name="betreff" required placeholder="Neue Vintage-Schätze ✦" />
        <Button type="submit" loading={isPending}>Erstellen & öffnen</Button>
      </form>
    </details>
  );
}
