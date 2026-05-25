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
  { value: "sehr_gut",    label: "Sehr gut"    },
  { value: "gut",         label: "Gut"         },
  { value: "akzeptabel",  label: "Akzeptabel"  },
  { value: "restauriert", label: "Restauriert" },
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
    { value: "", label: "Keine Kategorie" },
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
              Bitte Fehler korrigieren:
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
          Basisinformationen
        </h2>

        <Input
          label="Name"
          name="name"
          required
          defaultValue={produkt?.name}
          error={e("name")}
          placeholder="z.B. Biedermeier Kommode"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Preis (EUR)"
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
            label="Originalpreis (optional)"
            name="originalpreis"
            type="number"
            step="0.01"
            min="0"
            defaultValue={produkt?.originalpreis ?? ""}
            error={e("originalpreis")}
            placeholder="0.00"
            hint="Wird durchgestrichen angezeigt"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Kategorie"
            name="kategorie_id"
            options={kategorieOptions}
            defaultValue={String(produkt?.kategorie_id ?? "")}
            error={e("kategorie_id")}
          />
          <Select
            label="Zustand"
            name="zustand"
            required
            options={ZUSTAND_OPTIONS}
            defaultValue={produkt?.zustand ?? "gut"}
            error={e("zustand")}
          />
        </div>

        <Input
          label="Lagerbestand"
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
          Beschreibungen
        </h2>
        <Textarea
          label="Kurzbeschreibung"
          name="kurzbeschreibung"
          defaultValue={produkt?.kurzbeschreibung ?? ""}
          error={e("kurzbeschreibung")}
          placeholder="Kurze Zusammenfassung (max. 500 Zeichen)"
          maxLength={500}
          rows={3}
        />
        <Textarea
          label="Ausführliche Beschreibung"
          name="beschreibung"
          defaultValue={produkt?.beschreibung ?? ""}
          error={e("beschreibung")}
          placeholder="Detaillierte Produktbeschreibung, Geschichte, Besonderheiten …"
          rows={8}
        />
      </section>

      {/* ─── Details ──────────────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-5"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Epoche / Era"
            name="era"
            defaultValue={produkt?.era ?? ""}
            placeholder="z.B. 1920er, Art Déco"
          />
          <Input
            label="Herkunft"
            name="herkunft"
            defaultValue={produkt?.herkunft ?? ""}
            placeholder="z.B. Deutschland, Frankreich"
          />
          <Input
            label="Material"
            name="material"
            defaultValue={produkt?.material ?? ""}
            placeholder="z.B. Eiche, Messing, Porzellan"
          />
        </div>
        <Input
          label="Tags"
          name="tags"
          defaultValue={produkt?.tags?.join(", ") ?? ""}
          placeholder="vintage, antik, art deco  (kommagetrennt)"
          hint="Kommagetrennte Schlagwörter für die Suche"
        />
      </section>

      {/* ─── Sichtbarkeit ─────────────────────────────────────────── */}
      <section
        className="bg-vintage-white border border-vintage-sand p-6 space-y-4"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <h2 className="font-serif text-lg text-vintage-espresso border-b border-vintage-sand/50 pb-3">
          Sichtbarkeit
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
              Featured (Startseite)
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
              Als verkauft markieren
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
          label="SEO-Titel"
          name="seo_titel"
          defaultValue={produkt?.seo_titel ?? ""}
          placeholder="max. 70 Zeichen"
          maxLength={70}
          hint="Leer lassen = Produktname wird verwendet"
        />
        <Textarea
          label="SEO-Beschreibung"
          name="seo_beschreibung"
          defaultValue={produkt?.seo_beschreibung ?? ""}
          placeholder="max. 160 Zeichen"
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
            {produkt ? "Speichern" : "Produkt erstellen"}
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
                if (!confirm(`"${produkt.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                  e.preventDefault();
                }
              }}
            >
              Löschen
            </Button>
          </form>
        )}
      </div>
    </form>
  );
}
