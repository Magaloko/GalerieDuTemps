"use client";

import { useCallback, useState } from "react";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";

interface BildUploadZoneProps {
  produktId: string;
  onUpload:  (bild: { id: string; url: string; ist_hauptbild: boolean }) => void;
}

export function BildUploadZone({ produktId, onUpload }: BildUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading,  setUploading]  = useState<string[]>([]);
  const [fehler,     setFehler]     = useState<string | null>(null);

  const uploadDatei = useCallback(
    async (datei: File) => {
      const tmpId = crypto.randomUUID();
      setUploading(prev => [...prev, tmpId]);
      setFehler(null);

      try {
        const form = new FormData();
        form.append("datei",      datei);
        form.append("produkt_id", produktId);
        form.append("alt_text",   datei.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/bilder", { method: "POST", body: form });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Не удалось загрузить");
        }
        const bild = await res.json();
        onUpload(bild);
      } catch (err) {
        setFehler(err instanceof Error ? err.message : "Не удалось загрузить");
      } finally {
        setUploading(prev => prev.filter(id => id !== tmpId));
      }
    },
    [produktId, onUpload]
  );

  const handleDateien = useCallback(
    (dateien: FileList | null) => {
      if (!dateien) return;
      Array.from(dateien).forEach(uploadDatei);
    },
    [uploadDatei]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleDateien(e.dataTransfer.files);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleDateien(e.target.files);
    e.target.value = "";
  };

  const isUploading = uploading.length > 0;

  return (
    <div className="space-y-3">
      {/* Drop-Zone */}
      <label
        className={`
          relative flex flex-col items-center justify-center
          w-full min-h-36 cursor-pointer
          border-2 border-dashed transition-colors
          ${isDragging
            ? "border-vintage-gold bg-vintage-gold/5"
            : "border-vintage-sand hover:border-vintage-brown hover:bg-vintage-parchment/30"
          }
        `}
        style={{ borderRadius: "var(--radius-card)" }}
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
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-vintage-gold animate-spin" />
            <p className="text-sm font-sans text-vintage-brown">
              Загружается {uploading.length} {uploading.length === 1 ? "изображение" : "изображений"} …
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <div
              className="p-3 bg-vintage-parchment border border-vintage-sand"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              {isDragging ? (
                <Upload className="w-6 h-6 text-vintage-gold" />
              ) : (
                <ImagePlus className="w-6 h-6 text-vintage-brown" />
              )}
            </div>
            <p className="text-sm font-sans text-vintage-brown">
              Перетащите изображения сюда или{" "}
              <span className="text-vintage-gold underline">выберите</span>
            </p>
            <p className="text-xs text-vintage-dust">
              JPEG, PNG, WebP, AVIF · Макс. 10 МБ на изображение · Можно несколько
            </p>
          </div>
        )}
      </label>

      {/* Fehlermeldung */}
      {fehler && (
        <div className="flex items-center gap-2 px-4 py-3 bg-vintage-burgundy/10 border border-vintage-burgundy/30" style={{ borderRadius: "var(--radius-vintage)" }}>
          <X className="w-4 h-4 text-vintage-burgundy flex-shrink-0" />
          <p className="text-xs text-vintage-burgundy font-sans">{fehler}</p>
          <button onClick={() => setFehler(null)} className="ml-auto">
            <X className="w-3.5 h-3.5 text-vintage-burgundy" />
          </button>
        </div>
      )}
    </div>
  );
}
