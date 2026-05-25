"use client";

import { useRef, useState } from "react";
import { Bold, Italic, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Eye, Edit3 } from "lucide-react";
import { markdownToHtml } from "@/lib/utils/markdown";

interface Props {
  label?:       string;
  name:         string;
  defaultValue?: string;
  placeholder?: string;
  rows?:        number;
  error?:       string;
  hint?:        string;
}

interface ToolbarAction {
  icon:  React.ElementType;
  label: string;
  fn:    (txt: string, sel: string) => { text: string; cursor: number };
}

function wrap(prefix: string, suffix: string) {
  return (_txt: string, sel: string) => ({
    text:   `${prefix}${sel || "Text"}${suffix}`,
    cursor: prefix.length + (sel || "Text").length + suffix.length,
  });
}

function linePrefix(prefix: string) {
  return (_txt: string, sel: string) => {
    const lines = (sel || "Text").split("\n");
    const out   = lines.map(l => `${prefix}${l}`).join("\n");
    return { text: out, cursor: out.length };
  };
}

const ACTIONS: ToolbarAction[] = [
  { icon: Bold,         label: "Жирный",          fn: wrap("**", "**") },
  { icon: Italic,       label: "Курсив",          fn: wrap("*", "*") },
  { icon: Strikethrough, label: "Зачёркнутый",     fn: wrap("~~", "~~") },
  { icon: Heading2,     label: "Заголовок 2",     fn: linePrefix("## ") },
  { icon: Heading3,     label: "Заголовок 3",     fn: linePrefix("### ") },
  { icon: List,         label: "Список",          fn: linePrefix("- ") },
  { icon: ListOrdered,  label: "Нумерованный",    fn: linePrefix("1. ") },
  { icon: Quote,        label: "Цитата",          fn: linePrefix("> ") },
  { icon: LinkIcon,     label: "Ссылка",          fn: wrap("[", "](https://)") },
];

export function MarkdownEditor({
  label,
  name,
  defaultValue = "",
  placeholder,
  rows = 10,
  error,
  hint,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState<string>(defaultValue);
  const [mode,  setMode]  = useState<"edit" | "preview">("edit");

  const apply = (action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end);
    const { text: replacement } = action.fn(value, sel);
    const next = value.slice(0, start) + replacement + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">
          {label}
        </label>
      )}

      <div
        className={`border ${error ? "border-vintage-burgundy" : "border-vintage-sand/40"} bg-vintage-brown overflow-hidden`}
        style={{ borderRadius: "var(--radius-vintage)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-1 px-2 py-1.5 border-b border-vintage-sand/30 bg-vintage-espresso/50">
          <div className="flex items-center gap-0.5 flex-wrap">
            {ACTIONS.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => apply(a)}
                title={a.label}
                disabled={mode === "preview"}
                className="p-1.5 text-vintage-dust hover:text-vintage-gold hover:bg-vintage-brown disabled:opacity-30 transition-colors"
                style={{ borderRadius: "var(--radius-vintage)" }}
              >
                <a.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`px-2 py-1 text-xs font-sans flex items-center gap-1 transition-colors ${
                mode === "edit" ? "text-vintage-gold" : "text-vintage-dust hover:text-vintage-cream"
              }`}
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              <Edit3 className="w-3 h-3" /> Markdown
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={`px-2 py-1 text-xs font-sans flex items-center gap-1 transition-colors ${
                mode === "preview" ? "text-vintage-gold" : "text-vintage-dust hover:text-vintage-cream"
              }`}
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              <Eye className="w-3 h-3" /> Превью
            </button>
          </div>
        </div>

        {/* Editor / Preview */}
        {mode === "edit" ? (
          <textarea
            ref={textareaRef}
            name={name}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="
              w-full px-4 py-3
              bg-transparent
              text-vintage-cream text-sm font-sans
              placeholder:text-vintage-dust
              focus:outline-none
              resize-y
            "
          />
        ) : (
          <>
            <input type="hidden" name={name} value={value} />
            <div
              className="px-4 py-3 prose-vintage min-h-[10rem] text-sm text-vintage-cream"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(value) || `<p class="text-vintage-dust italic">Пусто</p>` }}
            />
          </>
        )}
      </div>

      {error && <p className="text-xs text-vintage-burgundy font-sans">{error}</p>}
      {hint && !error && <p className="text-xs text-vintage-dust font-sans">{hint}</p>}
    </div>
  );
}
