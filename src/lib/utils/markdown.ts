import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "del",
  "h2", "h3", "h4",
  "ul", "ol", "li",
  "blockquote",
  "a",
  "code", "pre",
  "hr",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

/**
 * Konvertiert Markdown zu sicherem HTML.
 * Output ist für dangerouslySetInnerHTML geeignet.
 * Sanitization: Whitelist-Tags/Attribute via DOMPurify; alle <script>, <iframe>,
 * onclick-Handler etc. werden entfernt.
 */
export function markdownToHtml(md: string | null | undefined): string {
  if (!md) return "";
  const raw = marked.parse(md, { gfm: true, breaks: true, async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["target", "rel"],
  });
}
