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

export function KontaktFormular({ labels }: { labels: KontaktLabels }) {
  const [state, formAction, isPending] = useActionState(kontaktSendenAction, null);

  if (state?.ok) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center bg-vintage-brown/40 border border-vintage-sand/40"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <CheckCircle2 className="w-12 h-12 text-vintage-gold mb-4" />
        <p className="font-serif text-2xl text-vintage-cream mb-2">{labels.gesendet}</p>
        <p className="text-vintage-dust font-sans text-sm max-w-xs">
          {labels.danke}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-vintage-brown border border-vintage-sand/40 p-8 space-y-5"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label={labels.name}  name="name"  required placeholder={labels.name_placeholder} />
        <Input label={labels.email} name="email" type="email" required placeholder={labels.email_placeholder} />
      </div>
      <Input label={labels.betreff} name="betreff" placeholder={labels.betreff_placeholder} />
      <Textarea label={labels.nachricht} name="nachricht" required rows={6} placeholder={labels.nachricht_placeholder} />

      {state?.error && (
        <p className="text-xs text-vintage-burgundy font-sans">{state.error}</p>
      )}

      <Button type="submit" loading={isPending} className="w-full justify-center">
        {labels.senden}
      </Button>
    </form>
  );
}
