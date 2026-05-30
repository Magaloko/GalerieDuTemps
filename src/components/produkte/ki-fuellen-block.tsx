"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Sparkles, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { produktKiAusfuellenAction } from "@/app/(admin)/admin/produkte/actions";

/**
 * KiFuellenBlock — „KI-Ausfüllen" für das Produkt-Vollformular.
 *
 * Liegt ÜBER dem (uncontrolled) Formular: der Operator tippt kurze Notizen,
 * der DeepSeek-Extraktor erzeugt Name, Beschreibung, Epoche, Material, Zustand,
 * Tags + SEO und schreibt sie in die DB. Danach `router.refresh()` → das
 * Formular darunter rendert mit den gefüllten Werten neu.
 *
 * Standardmäßig eingeklappt — stört den manuellen Workflow nicht, ist aber
 * mit einem Klick da. Überschreibt beim Ausführen die genannten Felder, daher
 * der Hinweis; Preis/Fotos/Sichtbarkeit bleiben unangetastet.
 */
export function KiFuellenBlock({ produktId }: { produktId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notizen, setNotizen] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = notizen.trim().length < 20;

  const run = () => {
    setError(null);
    setDone(false);
    if (tooShort) {
      setError("Заметки слишком короткие — минимум 20 символов");
      return;
    }
    start(async () => {
      const res = await produktKiAusfuellenAction(produktId, notizen);
      if (!res.ok) {
        setError(res.error ?? "Ошибка ИИ");
        return;
      }
      setDone(true);
      router.refresh();
      window.setTimeout(() => setDone(false), 4000);
    });
  };

  return (
    <section
      className="border p-0 overflow-hidden"
      style={{
        background: "var(--color-app-surface)",
        borderColor: "rgba(232,112,58,0.35)",
        borderRadius: "var(--radius-app)",
      }}
    >
      {/* Header — Toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--color-paper-warm)]"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex items-center justify-center w-7 h-7 shrink-0"
            style={{ background: "rgba(232,112,58,0.12)", borderRadius: "var(--radius-app)" }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--color-coral)" }} />
          </span>
          <span className="min-w-0">
            <span
              className="block font-serif text-base leading-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Заполнить с ИИ
            </span>
            <span
              className="block text-xs font-sans truncate"
              style={{ color: "var(--color-ink-mute)" }}
            >
              Заметки → название, описание, эпоха, материал, теги, SEO
            </span>
          </span>
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0 transition-transform"
          style={{ color: "var(--color-ink-mute)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="px-5 pb-5 space-y-4 pt-4"
          style={{ borderTop: "1px solid var(--color-line)" }}
        >
          <Textarea
            tone="app"
            label="Заметки о товаре"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="напр. Комод бидермейер, около 1840, дуб с латунной фурнитурой. Высота 90 см. Лёгкая реставрация, оригинальные ключи."
            rows={4}
            hint="Минимум 20 символов. Чем больше деталей — тем точнее результат."
          />

          {error && (
            <div
              className="flex items-start gap-2.5 px-4 py-3"
              style={{
                background: "rgba(194,71,71,0.10)",
                border: "1px solid rgba(194,71,71,0.30)",
                borderRadius: "var(--radius-app)",
                color: "var(--color-vintage-burgundy)",
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-sm font-sans">{error}</p>
            </div>
          )}

          {done && (
            <div
              className="flex items-center gap-2.5 px-4 py-3"
              style={{
                background: "rgba(127,140,90,0.12)",
                border: "1px solid rgba(127,140,90,0.45)",
                borderRadius: "var(--radius-app)",
                color: "#52663F",
              }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="text-sm font-sans">
                <strong>Готово.</strong> Поля ниже заполнены — проверьте и при необходимости поправьте.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-sans max-w-md" style={{ color: "var(--color-ink-mute)" }}>
              Перезаписывает название, описание, детали, теги и SEO. Цена, фото и
              видимость не затрагиваются.
            </p>
            <Button
              type="button"
              onClick={run}
              loading={pending}
              disabled={tooShort}
              icon={<Wand2 className="w-3.5 h-3.5" />}
            >
              {pending ? "ИИ обрабатывает…" : "Заполнить"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
