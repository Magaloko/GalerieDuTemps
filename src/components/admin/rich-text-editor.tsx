"use client";

import { useEffect, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from "@lexical/list";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import {
  $getSelection, $isRangeSelection, $createParagraphNode,
  FORMAT_TEXT_COMMAND, type EditorState,
} from "lexical";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2 } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * RichTextEditor — Lexical-basierter WYSIWYG-Editor (portiert aus Amina V3).
 *
 * Markdown rein/raus: lädt den initialen Markdown-String, exportiert bei jeder
 * Änderung wieder Markdown via @lexical/markdown. So bleibt das DB-Feld
 * `markdown` + die öffentliche Anzeige (markdownToHtml) unverändert —
 * rückwärtskompatibel, keine Migration. Redakteure bekommen aber eine echte
 * Formatier-Toolbar statt rohem Markdown.
 * ────────────────────────────────────────────────────────────────────────── */
export function RichTextEditor({
  initialMarkdown,
  onChange,
  placeholder = "Текст статьи…",
  tone = "shop",
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** Visueller Ton. "shop" = Legacy-Dark (default), "app" = heller Operator-App-Stil. */
  tone?: "shop" | "app";
}) {
  const isApp = tone === "app";
  return (
    <LexicalComposer
      initialConfig={{
        namespace: "galerie-journal",
        theme: {
          paragraph: "mb-2",
          heading: { h2: "font-serif text-xl mt-4 mb-2", h3: "font-serif text-lg mt-3 mb-1.5" },
          list: { ul: "list-disc ml-5 mb-2", ol: "list-decimal ml-5 mb-2", listitem: "mb-0.5" },
          quote: isApp
            ? "border-l-2 pl-3 italic my-2 border-[var(--color-coral)] text-[var(--color-ink-soft)]"
            : "border-l-2 border-vintage-gold pl-3 italic text-vintage-brown my-2",
          link: isApp ? "text-[var(--color-coral)] underline" : "text-vintage-gold underline",
          text: { bold: "font-semibold", italic: "italic" },
        },
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
        onError: (e: Error) => console.error("[RichTextEditor]", e),
      }}
    >
      <div
        className={isApp ? "" : "border border-vintage-sand bg-vintage-white"}
        style={
          isApp
            ? {
                borderRadius: "var(--radius-app)",
                border: "1px solid var(--color-line)",
                background: "var(--color-app-surface)",
              }
            : { borderRadius: "var(--radius-card)" }
        }
      >
        <Toolbar tone={tone} />
        <div
          className={`relative px-3 py-2 text-sm min-h-[180px] ${isApp ? "" : "text-vintage-espresso"}`}
          style={isApp ? { color: "var(--color-ink)" } : undefined}
        >
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none min-h-[160px]" />}
            placeholder={
              <div
                className={`absolute top-2 left-3 pointer-events-none ${isApp ? "" : "text-vintage-dust"}`}
                style={isApp ? { color: "var(--color-ink-mute)" } : undefined}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <LinkPlugin />
      <LoadMarkdownPlugin initialMarkdown={initialMarkdown} />
      <ExportMarkdownPlugin onChange={onChange} />
    </LexicalComposer>
  );
}

/** Lädt den initialen Markdown EINMAL in den Editor. */
function LoadMarkdownPlugin({ initialMarkdown }: { initialMarkdown: string }) {
  const [editor] = useLexicalComposerContext();
  const [geladen, setGeladen] = useState(false);
  useEffect(() => {
    if (geladen) return;
    editor.update(() => {
      $convertFromMarkdownString(initialMarkdown ?? "", TRANSFORMERS);
    });
    setGeladen(true);
  }, [editor, initialMarkdown, geladen]);
  return null;
}

/** Exportiert bei jeder Änderung Markdown an den Parent. */
function ExportMarkdownPlugin({ onChange }: { onChange: (md: string) => void }) {
  const handle = (state: EditorState) => {
    state.read(() => onChange($convertToMarkdownString(TRANSFORMERS)));
  };
  return <OnChangePlugin onChange={handle} ignoreSelectionChange />;
}

/** Formatier-Toolbar. */
function Toolbar({ tone = "shop" }: { tone?: "shop" | "app" }) {
  const [editor] = useLexicalComposerContext();
  const isApp = tone === "app";

  const setBlock = (kind: "h2" | "h3" | "quote" | "p") => {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      $setBlocksType(sel, () =>
        kind === "h2" ? $createHeadingNode("h2")
        : kind === "h3" ? $createHeadingNode("h3")
        : kind === "quote" ? $createQuoteNode()
        : $createParagraphNode(),
      );
    });
  };

  const addLink = () => {
    const url = window.prompt("URL:");
    if (url === null) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() || null);
  };

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={title}
      className={`p-1.5 rounded transition-colors ${isApp ? "text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-warm)]" : "text-vintage-brown hover:bg-vintage-parchment"}`}>
      {children}
    </button>
  );

  const sep = isApp ? "w-px h-4 mx-1 bg-[var(--color-line)]" : "w-px h-4 bg-vintage-sand mx-1";

  return (
    <div
      className={`flex items-center gap-0.5 flex-wrap px-2 py-1.5 ${isApp ? "" : "border-b border-vintage-sand"}`}
      style={isApp ? { borderBottom: "1px solid var(--color-line)" } : undefined}
    >
      <Btn onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} title="Жирный"><Bold className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} title="Курсив"><Italic className="w-4 h-4" /></Btn>
      <span className={sep} />
      <Btn onClick={() => setBlock("h2")} title="Заголовок 2"><Heading2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => setBlock("h3")} title="Заголовок 3"><Heading3 className="w-4 h-4" /></Btn>
      <Btn onClick={() => setBlock("quote")} title="Цитата"><Quote className="w-4 h-4" /></Btn>
      <span className={sep} />
      <Btn onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Список"><List className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Нумерованный"><ListOrdered className="w-4 h-4" /></Btn>
      <Btn onClick={addLink} title="Ссылка"><Link2 className="w-4 h-4" /></Btn>
    </div>
  );
}
