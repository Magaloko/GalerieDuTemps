"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button }   from "@/components/ui/button";
import { kontaktSendenAction } from "./actions";

export interface KontaktLabels {
  name:                  string;
  name_placeholder:      string;
  email:                 string;
  email_placeholder:     string;
  betreff:               string;
  betreff_placeholder:   string;
  nachricht:             string;
  nachricht_placeholder: string;
  senden:                string;
  gesendet:              string;
  danke:                 string;
}

export function KontaktFormular({
  labels,
  prefill,
}: {
  labels: KontaktLabels;
  /** Vorbelegung z.B. aus Reservierungs-/Produkt-Anfrage (Betreff + Nachricht). */
  prefill?: { betreff?: string; nachricht?: string };
}) {
  const [state, formAction, isPending] = useActionState(kontaktSendenAction, null);

  if (state?.ok) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        style={{ background: "#fff", border: "1px solid var(--color-line)" }}
      >
        <CheckCircle2 className="w-12 h-12 mb-4" style={{ color: "var(--color-coral)" }} />
        <p
          className="mb-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   28,
            color:      "var(--color-ink)",
          }}
        >
          {labels.gesendet}
        </p>
        <p
          className="max-w-xs text-sm"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          {labels.danke}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="p-8 space-y-5"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label={labels.name}  name="name"  required placeholder={labels.name_placeholder} />
        <Input label={labels.email} name="email" type="email" required placeholder={labels.email_placeholder} />
      </div>
      <Input label={labels.betreff} name="betreff" placeholder={labels.betreff_placeholder} defaultValue={prefill?.betreff} />
      <Textarea label={labels.nachricht} name="nachricht" required rows={6} placeholder={labels.nachricht_placeholder} defaultValue={prefill?.nachricht} />

      {state?.error && (
        <p className="text-xs" style={{ color: "var(--color-coral-deep)" }}>{state.error}</p>
      )}

      <Button type="submit" loading={isPending} className="w-full justify-center btn-coral btn-coral-lg">
        {labels.senden}
      </Button>
    </form>
  );
}
