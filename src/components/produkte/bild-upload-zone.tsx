"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Loader2, ImagePlus, AlertCircle, Clipboard, CheckCircle2 } from "lucide-react";
import type { Produktbild } from "@/types/produkt";

interface BildUploadZoneProps {
  produktId: string;
  onUpload:  (bild: Produktbild) => void;
}

/* ──────────────────────────────────────────────────────────────────────────
 * BildUploadZone v2 — verbesserter Upload mit:
 *  - Per-File-Preview (Thumbnail VOR Upload via FileReader)
 *  - Per-File-Progress + Error-State
 *  - Cancel pro Datei (XHR abort)
 *  - Clipboard-Paste (Cmd+V) — Screenshot direkt hochladen
 *  - Drag-and-drop + Click-to-select wie bisher
 *  - HEIC/HEIF/JPEG/PNG/WebP/AVIF
 *  - Server-Pipeline kompremiert + WebP-Varianten automatisch
 * ────────────────────────────────────────────────────────────────────────── */

type UploadStatus = "queued" | "uploading" | "done" | "error" | "cancelled";

interface UploadItem {
  id:        string;
  file:      File;
  previewDataUrl?: string;
  status:    UploadStatus;
  progress:  number;          // 0-100
  error?:    string;
  xhr?:      XMLHttpRequest;  // für Cancel
}

const ALLOWED_MIME = [
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/avif", "image/heic", "image/heif",
];

const PREVIEW_MAX_MB = 20;

export function BildUploadZone({ produktId, onUpload }: BildUploadZoneProps) {
  const [items, setItems]           = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const dropRef = useRef<HTMLLabelElement>(null);

  // ── File-Preview-Generator ────────────────────────────────────────────────
  const generatePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("FileReader failed"));
      reader.readAsDataURL(file);
    });
  }, []);

  // ── Single Upload (XHR für Progress + Cancel) ─────────────────────────────
  const uploadFile = useCallback(
    (item: UploadItem) => {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i));

      const form = new FormData();
      form.append("datei",      item.file);
      form.append("produkt_id", produktId);
      form.append("alt_text",   item.file.name.replace(/\.[^/.]+$/, ""));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/bilder");

      // Progress
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = Math.round((e.loaded / e.total) * 100);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress } : i));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const bild = JSON.parse(xhr.responseText) as Produktbild;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done", progress: 100 } : i));
            onUpload(bild);
            // Nach 2s aus Liste entfernen
            setTimeout(() => {
              setItems(prev => prev.filter(i => i.id !== item.id));
            }, 2000);
          } catch {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: "Antwort ungültig" } : i));
          }
        } else {
          let err = `HTTP ${xhr.status}`;
          try {
            const j = JSON.parse(xhr.responseText);
            if (j.error) err = j.error;
          } catch { /* ignore */ }
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: err } : i));
        }
      };

      xhr.onerror = () => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: "Сетевая ошибка" } : i));
      };

      xhr.onabort = () => {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "cancelled" } : i));
      };

      setItems(prev => prev.map(i => i.id === item.id ? { ...i, xhr } : i));
      xhr.send(form);
    },
    [produktId, onUpload],
  );

  // ── File-Queue verarbeiten ────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      if (!fileList) return;
      const files = Array.from(fileList);
      setGlobalError(null);

      // Pre-validate
      const validFiles: File[] = [];
      for (const f of files) {
        if (!ALLOWED_MIME.includes(f.type) && !f.name.match(/\.(heic|heif)$/i)) {
          setGlobalError(`${f.name}: тип не поддерживается (${f.type || "?"})`);
          continue;
        }
        if (f.size > PREVIEW_MAX_MB * 1024 * 1024) {
          setGlobalError(`${f.name}: слишком большой (>${PREVIEW_MAX_MB} МБ)`);
          continue;
        }
        validFiles.push(f);
      }

      // Items mit Preview erstellen
      const newItems: UploadItem[] = await Promise.all(
        validFiles.map(async (f) => {
          let previewDataUrl: string | undefined;
          try {
            previewDataUrl = await generatePreview(f);
          } catch { /* ignore — kein Preview ist OK */ }
          return {
            id:       crypto.randomUUID(),
            file:     f,
            previewDataUrl,
            status:   "queued" as const,
            progress: 0,
          };
        }),
      );

      setItems(prev => [...prev, ...newItems]);

      // Sequentiell uploaden um Server nicht zu fluten (sharp ist CPU-heavy)
      // Bei 3+ parallel uploads würde der Coolify-Container temporär 100% CPU.
      for (const item of newItems) {
        uploadFile(item);
      }
    },
    [generatePreview, uploadFile],
  );

  // ── Drag-and-Drop ─────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  // ── Clipboard-Paste (Cmd+V) ───────────────────────────────────────────────
  // Listener global so dass nicht erst die Zone geklickt sein muss
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Wenn User in einem Input/Textarea tippt → nicht abfangen
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const files: File[] = [];
      for (const item of e.clipboardData?.items ?? []) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles]);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.xhr) item.xhr.abort();
    else setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleRetry = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    uploadFile({ ...item, status: "queued", error: undefined, progress: 0 });
  };

  const handleDismiss = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drop-Zone */}
      <label
        ref={dropRef}
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-40 cursor-pointer
          border-2 border-dashed transition-colors
          ${isDragging
            ? "border-[var(--color-coral)] bg-[rgba(232,112,58,0.05)]"
            : "border-[var(--color-line)] hover:border-[var(--color-ink-soft)] hover:bg-[var(--color-bone)]"
          }
        `}
        style={{ borderRadius: "var(--radius-app)" }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
          multiple
          className="sr-only"
          onChange={onChange}
        />

        <div className="flex flex-col items-center gap-2 text-center px-6">
          <div
            className="p-3 bg-[var(--color-bone)] border border-[var(--color-line)]"
            style={{ borderRadius: "var(--radius-app)" }}
          >
            {isDragging
              ? <Upload    className="w-6 h-6 text-[var(--color-coral)]" />
              : <ImagePlus className="w-6 h-6 text-[var(--color-ink-soft)]" />}
          </div>
          <p className="text-sm font-sans text-[var(--color-ink-soft)]">
            Перетащите фото или{" "}
            <span className="text-[var(--color-coral)] underline">выберите файлы</span>
          </p>
          <p className="text-xs text-[var(--color-ink-mute)] flex items-center gap-1.5 flex-wrap justify-center">
            <span>JPEG · PNG · WebP · HEIC (iPhone) · AVIF</span>
            <span className="text-[var(--color-line)]">·</span>
            <span>Макс. {PREVIEW_MAX_MB} МБ</span>
            <span className="text-[var(--color-line)]">·</span>
            <span className="inline-flex items-center gap-1">
              <Clipboard className="w-3 h-3" /> Cmd+V
            </span>
          </p>
          <p className="text-[10px] text-[var(--color-ink-mute)] font-mono mt-1">
            Авто-обработка: оптимизация · WebP-варианты (thumb/medium/large) · сжатие · EXIF-strip
          </p>
        </div>
      </label>

      {/* Global Error */}
      {globalError && (
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
          <p className="flex-1">{globalError}</p>
          <button onClick={() => setGlobalError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Per-File-Progress-List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <UploadItemCard
              key={item.id}
              item={item}
              onCancel={() => handleCancel(item.id)}
              onRetry={() => handleRetry(item.id)}
              onDismiss={() => handleDismiss(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Per-Item-Card ──────────────────────────────────────────────────────────
function UploadItemCard({
  item, onCancel, onRetry, onDismiss,
}: {
  item:      UploadItem;
  onCancel:  () => void;
  onRetry:   () => void;
  onDismiss: () => void;
}) {
  const sizeMb = (item.file.size / 1024 / 1024).toFixed(1);

  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{
        background:   "var(--color-app-surface)",
        border:       "1px solid var(--color-line)",
        borderRadius: "var(--radius-app)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 shrink-0 overflow-hidden bg-[var(--color-bone)] relative"
        style={{ borderRadius: "var(--radius-app)" }}
      >
        {item.previewDataUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.previewDataUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--color-ink-mute)]">
            <ImagePlus className="w-5 h-5" />
          </div>
        )}
        {item.status === "uploading" && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
        {item.status === "done" && (
          <div className="absolute inset-0 bg-[rgba(107,168,138,0.4)] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Info + Progress */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans text-[var(--color-ink)] truncate">{item.file.name}</p>
        <p className="text-[11px] text-[var(--color-ink-mute)] font-mono">
          {sizeMb} МБ
          {item.status === "uploading" && ` · ${item.progress}%`}
          {item.status === "done"      && " · готово ✓"}
          {item.status === "cancelled" && " · отменено"}
          {item.status === "error"     && (
            <span className="text-[var(--color-vintage-burgundy)]"> · {item.error}</span>
          )}
        </p>
        {item.status === "uploading" && (
          <div className="mt-1.5 h-1 bg-[var(--color-bone)] overflow-hidden" style={{ borderRadius: 2 }}>
            <div
              className="h-full transition-all bg-[var(--color-coral)]"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Action-Button */}
      <div className="shrink-0">
        {item.status === "uploading" && (
          <button
            onClick={onCancel}
            className="p-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-vintage-burgundy)] transition-colors"
            aria-label="Отменить"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {item.status === "error" && (
          <div className="flex items-center gap-1">
            <button
              onClick={onRetry}
              className="text-[11px] font-mono uppercase tracking-widest px-2 py-1 text-[var(--color-coral)] border border-[rgba(232,112,58,0.4)] hover:bg-[rgba(232,112,58,0.1)]"
              style={{ borderRadius: "var(--radius-app)" }}
            >
              Повторить
            </button>
            <button onClick={onDismiss} className="p-1 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {(item.status === "cancelled" || item.status === "done") && (
          <button
            onClick={onDismiss}
            className="p-1.5 text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] transition-colors"
            aria-label="Скрыть"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
