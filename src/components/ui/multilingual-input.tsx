"use client";

import { useState } from "react";
import { Input }    from "./input";
import { Textarea } from "./textarea";

const LOCALES: { code: "ru" | "en" | "de"; flag: string; label: string }[] = [
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
];

interface Props {
  label:         string;
  name:          string;     // hidden input field-name (JSON-stringified value)
  initial:       Record<string, string>;
  fallbackValue?: string;    // wert aus old single-spalte, wird als ru vorbefüllt wenn ru leer
  variant?:      "input" | "textarea" | "markdown";
  maxLength?:    number;
  rows?:         number;
  placeholder?:  string;
  /** Live-Callback (z.B. für Vorschau). Bekommt die komplette Locale-Map. */
  onChange?:     (values: Record<string, string>) => void;
}

/**
 * Multilingual-Input mit Tab-Switcher für RU/EN/DE.
 * Value wird als JSON-String in einem hidden Input gespeichert,
 * Server-Action liest das via FormData.get(name).
 */
export function MultilingualInput({
  label, name, initial, fallbackValue, variant = "input",
  maxLength, rows, placeholder, onChange,
}: Props) {
  // Initialwert: jeweilige Locale aus initial, oder ru = fallbackValue
  const initialMap: Record<string, string> = {
    ru: initial.ru ?? fallbackValue ?? "",
    en: initial.en ?? "",
    de: initial.de ?? "",
  };

  const [values, setValues] = useState<Record<string, string>>(initialMap);
  const [active, setActive] = useState<"ru" | "en" | "de">("ru");

  const setValue = (loc: "ru"|"en"|"de", v: string) => {
    setValues(prev => {
      const next = { ...prev, [loc]: v };
      onChange?.(next);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Tab-Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">
          {label}
        </span>
        <div className="flex items-center gap-0.5">
          {LOCALES.map(l => {
            const filled = (values[l.code] ?? "").trim().length > 0;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setActive(l.code)}
                title={l.label}
                className={`px-2 py-1 text-[10px] font-sans uppercase tracking-widest border transition-colors flex items-center gap-1 ${
                  active === l.code
                    ? "bg-vintage-espresso text-vintage-cream border-vintage-espresso"
                    : "border-vintage-sand/40 text-vintage-dust hover:bg-vintage-parchment"
                }`}
                style={{ borderRadius: "var(--radius-vintage)" }}
              >
                <span>{l.flag}</span> {l.code}
                <span className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-vintage-sage" : "bg-vintage-sand/40"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Aktives Eingabefeld */}
      {variant === "markdown" ? (
        <Textarea
          value={values[active] ?? ""}
          onChange={(e) => setValue(active, e.target.value)}
          rows={rows ?? 10}
          placeholder={placeholder}
          hint="Markdown unterstützt: **жирный**, *курсив*, ## заголовки, - списки"
        />
      ) : variant === "textarea" ? (
        <Textarea
          value={values[active] ?? ""}
          onChange={(e) => setValue(active, e.target.value)}
          rows={rows ?? 3}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      ) : (
        <Input
          value={values[active] ?? ""}
          onChange={(e) => setValue(active, e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      )}

      {/* Hidden: JSON-Aggregat zur Übergabe an Server Action */}
      <input type="hidden" name={name} value={JSON.stringify(values)} />
    </div>
  );
}
