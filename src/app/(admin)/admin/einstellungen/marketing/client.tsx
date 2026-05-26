"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { saveMarketingStringAction } from "./actions";
import type { MarketingString } from "@/lib/db/marketing-strings";

const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English"  },
  { code: "de", label: "Deutsch"  },
] as const;

/* ──────────────────────────────────────────────────────────────────────────
 * MarketingTextsClient
 *
 * Eine Card pro String mit Sprach-Tabs/Textareas und einem Save-Button.
 * Save geht via Server-Action, status pro Card lokal (saving/ok/error).
 *
 * UX-Entscheidung: kein „alle speichern"-Button — pro String einzeln saven
 * vermeidet versehentliches Überschreiben halbfertiger Edits in anderen
 * Strings und macht den Diff-Audit nachvollziehbarer.
 * ────────────────────────────────────────────────────────────────────────── */
export function MarketingTextsClient({ strings }: { strings: MarketingString[] }) {
  return (
    <div className="space-y-4">
      {strings.map(s => (
        <StringCard key={s.schluessel} data={s} />
      ))}
    </div>
  );
}

function StringCard({ data }: { data: MarketingString }) {
  const [werte, setWerte] = useState<Record<string, string>>({
    ru: data.wert_i18n.ru ?? "",
    en: data.wert_i18n.en ?? "",
    de: data.wert_i18n.de ?? "",
  });
  const [pending, startTransition] = useTransition();
  const [result,  setResult]       = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg]    = useState<string | null>(null);

  const handleSave = () => {
    setResult("idle");
    setErrorMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("schluessel", data.schluessel);
      fd.set("wert_ru", werte.ru);
      fd.set("wert_en", werte.en);
      fd.set("wert_de", werte.de);
      const res = await saveMarketingStringAction(null, fd);
      if (res.ok) {
        setResult("ok");
        setTimeout(() => setResult("idle"), 2000);
      } else {
        setResult("error");
        setErrorMsg(res.error);
      }
    });
  };

  // Multi-line wenn original > 60 Zeichen
  const longest = Math.max(werte.ru.length, werte.en.length, werte.de.length);
  const isLong  = longest > 60;

  return (
    <div
      className="p-5"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <header className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
        <div>
          <code
            className="text-[12px] font-medium"
            style={{
              color:        "var(--color-coral)",
              fontFamily:   "var(--font-mono)",
              background:   "var(--color-bone)",
              padding:      "2px 8px",
              border:       "1px solid var(--color-line)",
            }}
          >
            {data.schluessel}
          </code>
          {data.beschreibung && (
            <p
              className="mt-2 text-[12px]"
              style={{
                fontFamily: "var(--font-italic)",
                fontStyle:  "italic",
                color:      "var(--color-ink-mute)",
              }}
            >
              {data.beschreibung}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="btn-coral btn-coral-sm"
          style={{ minHeight: 36 }}
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {!pending && result === "ok"    && <Check className="w-3.5 h-3.5" />}
          {!pending && result === "error" && <AlertCircle className="w-3.5 h-3.5" />}
          {pending ? "Speichert…" : result === "ok" ? "Gespeichert" : "Speichern"}
        </button>
      </header>

      {result === "error" && errorMsg && (
        <p
          className="mb-3 px-3 py-2 text-[12px]"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep)",
          }}
        >
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {LANGUAGES.map(lang => (
          <label key={lang.code} className="block">
            <span
              className="block mb-1 text-[10px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-soft)" }}
            >
              {lang.label}
            </span>
            {isLong ? (
              <textarea
                value={werte[lang.code]}
                onChange={e => setWerte(prev => ({ ...prev, [lang.code]: e.target.value }))}
                rows={3}
                className="ms-input"
              />
            ) : (
              <input
                type="text"
                value={werte[lang.code]}
                onChange={e => setWerte(prev => ({ ...prev, [lang.code]: e.target.value }))}
                className="ms-input"
              />
            )}
          </label>
        ))}
      </div>

      <style>{`
        .ms-input {
          width: 100%;
          padding: 8px 10px;
          background: var(--color-bone);
          border: 1px solid var(--color-line);
          color: var(--color-ink);
          font-family: var(--font-sans);
          font-size: 14px;
          line-height: 1.4;
          border-radius: 0;
        }
        .ms-input:focus {
          outline: none;
          border-color: var(--color-coral);
        }
      `}</style>
    </div>
  );
}
