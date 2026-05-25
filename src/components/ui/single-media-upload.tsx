"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, ImageIcon, Film, FileText } from "lucide-react";

interface Props {
  label?:      string;
  name:        string;
  accept?:     string;       // z.B. "image/*" oder "video/*" oder "application/pdf"
  defaultValue?: string;     // existing URL
  placeholder?: string;
  hint?:       string;
  variant?:    "image" | "video" | "file";
}

const ICONS = { image: ImageIcon, video: Film, file: FileText };

export function SingleMediaUpload({
  label,
  name,
  accept = "image/*",
  defaultValue = "",
  placeholder = "https://…",
  hint,
  variant = "image",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url,    setUrl]    = useState<string>(defaultValue);
  const [busy,   setBusy]   = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const Icon = ICONS[variant];

  const handleUpload = async (file: File) => {
    setBusy(true);
    setFehler(null);
    try {
      const fd = new FormData();
      fd.append("datei", file);
      const res = await fetch("/api/upload/media", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить");
      setUrl(data.url);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Не удалось загрузить");
    } finally {
      setBusy(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-sans uppercase tracking-widest text-vintage-gold/80">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          className="
            flex-1 px-4 py-2.5
            bg-vintage-brown border border-vintage-sand/40
            text-vintage-cream text-sm font-sans
            placeholder:text-vintage-dust
            focus:outline-none focus:border-vintage-gold focus:ring-1 focus:ring-vintage-gold/30
            transition-colors
          "
          style={{ borderRadius: "var(--radius-vintage)" }}
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={onChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="
            inline-flex items-center gap-2 px-4 py-2.5
            bg-vintage-espresso text-vintage-cream
            text-xs font-sans uppercase tracking-widest
            hover:bg-vintage-brown disabled:opacity-50 transition-colors
            border border-vintage-sand/30
          "
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {busy ? "Загрузка…" : "Загрузить"}
        </button>
      </div>

      {/* Preview */}
      {url && !busy && (
        <div className="relative mt-2 inline-block">
          {variant === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="max-h-32 border border-vintage-sand/40"
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
          ) : variant === "video" && /\.(mp4|webm|mov)$/i.test(url) ? (
            <video
              src={url}
              controls
              className="max-h-40 border border-vintage-sand/40"
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 border border-vintage-sand/40 text-vintage-cream text-xs font-sans hover:bg-vintage-espresso transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              <Icon className="w-3.5 h-3.5" /> Просмотр
            </a>
          )}
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute -top-2 -right-2 p-1 bg-vintage-burgundy text-vintage-cream hover:bg-vintage-burgundy/80 transition-colors"
            style={{ borderRadius: "9999px" }}
            title="Удалить"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {fehler && (
        <p className="text-xs text-vintage-burgundy font-sans">{fehler}</p>
      )}
      {hint && !fehler && (
        <p className="text-xs text-vintage-dust font-sans">{hint}</p>
      )}
    </div>
  );
}
