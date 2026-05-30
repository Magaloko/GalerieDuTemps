"use client";

import { useState } from "react";
import { X, Plus, ExternalLink, AlertCircle } from "lucide-react";
import { InstagramIcon } from "./instagram-icon";
import { extractInstagramUrl } from "@/lib/utils/instagram";

interface Props {
  /** Name des form-fields (mehrere Hidden-Inputs mit selbem name → array on submit) */
  name:           string;
  /** Initial-URLs (bei Edit-Form vorhanden) */
  defaultValue?: string[];
  /** Maximal-Anzahl pro Produkt */
  max?: number;
}

/* ──────────────────────────────────────────────────────────────────────────
 * InstagramUrlsInput
 *
 * Admin-UI um IG-Reels/Posts an ein Produkt anzuhängen.
 *
 * Bedienung:
 *  - Textarea zum Paste: User kann entweder die reine URL ODER den kompletten
 *    <blockquote class="instagram-media" ...> Embed-Code reinkopieren.
 *  - "+ Add" extrahiert daraus die kanonische Permalink-URL und fügt sie zur
 *    Liste hinzu. Doppelte werden ignoriert.
 *  - Pro URL: Vorschau-Karte mit URL + Externer-Link + Lösch-Button.
 *  - Drag-Sort wird in v2 ergänzt — vorerst Reihenfolge des Hinzufügens.
 *
 * Form-Submit: pro URL ein hidden input mit name={name} → formData.getAll(name)
 * im Server-Action liefert das Array.
 * ────────────────────────────────────────────────────────────────────────── */

export function InstagramUrlsInput({ name, defaultValue = [], max = 5 }: Props) {
  const [urls, setUrls]         = useState<string[]>(defaultValue);
  const [draft, setDraft]       = useState("");
  const [fehler, setFehler]     = useState<string | null>(null);

  const canAdd = urls.length < max && draft.trim().length > 0;

  const handleAdd = () => {
    setFehler(null);
    const extracted = extractInstagramUrl(draft);
    if (!extracted) {
      setFehler("Не похоже на Instagram-ссылку. Скопируй URL или embed-код целиком.");
      return;
    }
    if (urls.includes(extracted)) {
      setFehler("Эта ссылка уже добавлена.");
      return;
    }
    if (urls.length >= max) {
      setFehler(`Максимум ${max} embed на товар.`);
      return;
    }
    setUrls([...urls, extracted]);
    setDraft("");
  };

  const handleRemove = (i: number) => {
    setUrls(urls.filter((_, idx) => idx !== i));
  };

  const handleMove = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    setUrls(next);
  };

  return (
    <div className="space-y-3">
      {/* ── Existierende URLs ─────────────────────────────────────────── */}
      {urls.length > 0 && (
        <ul className="space-y-2">
          {urls.map((url, i) => (
            <li
              key={url}
              className="flex items-center gap-3 p-3"
              style={{
                background:   "#fff",
                border:       "1px solid var(--color-line)",
                borderLeft:   "3px solid #C13584",  // IG-Pink
                borderRadius: "var(--radius-app)",
              }}
            >
              <InstagramIcon className="w-4 h-4 shrink-0" style={{ color: "#C13584" }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-[var(--color-ink)] truncate">{url}</p>
                <p className="text-[9px] font-mono text-[var(--color-ink-mute)] uppercase tracking-widest">
                  Embed #{i + 1}
                </p>
              </div>

              {/* Reorder */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  className="text-[10px] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] disabled:opacity-30"
                  aria-label="Вверх"
                >▲</button>
                <button
                  type="button"
                  onClick={() => handleMove(i, +1)}
                  disabled={i === urls.length - 1}
                  className="text-[10px] text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] disabled:opacity-30"
                  aria-label="Вниз"
                >▼</button>
              </div>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-coral)] transition-colors"
                title="Открыть в Instagram"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="p-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-vintage-burgundy)] transition-colors"
                title="Удалить"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Hidden input für Form-Submit */}
              <input type="hidden" name={name} value={url} />
            </li>
          ))}
        </ul>
      )}

      {/* Wenn 0 URLs: einen leeren hidden input mitschicken sodass das Feld
          beim UPDATE auch geleert werden kann (sonst bleibt es bei "undefined") */}
      {urls.length === 0 && <input type="hidden" name={name} value="" />}

      {/* ── Eingabe ────────────────────────────────────────────────────── */}
      {urls.length < max && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); if (fehler) setFehler(null); }}
            rows={2}
            placeholder="URL вставь сюда — https://www.instagram.com/reel/...  или embed-код целиком (<blockquote>…)"
            className="w-full p-2.5 text-[12px] font-mono"
            style={{
              background:   "#fff",
              border:       "1px solid var(--color-line)",
              borderRadius: "var(--radius-app)",
            }}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-[var(--color-ink-mute)] font-sans flex items-center gap-1.5">
              <InstagramIcon className="w-3 h-3" style={{ color: "#C13584" }} />
              Reels, Posts, IGTV · максимум {max} на товар · {urls.length}/{max} использовано
            </p>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase font-medium px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{
                letterSpacing: "0.18em",
                background:    "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)",
                color:         "#fff",
                borderRadius:  "var(--radius-app)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить
            </button>
          </div>
        </div>
      )}

      {fehler && (
        <div
          className="flex items-center gap-2 px-3 py-2 text-xs font-sans"
          style={{
            background:   "rgba(232,112,58,0.08)",
            border:       "1px solid rgba(232,112,58,0.40)",
            color:        "#A53E26",
            borderRadius: "var(--radius-app)",
          }}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {fehler}
        </div>
      )}
    </div>
  );
}
