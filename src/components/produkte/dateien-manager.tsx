"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Loader2, FileText, ExternalLink } from "lucide-react";
import type { Produktdatei } from "@/types/produkt";

interface Props {
  produktId:     string;
  initialItems:  Produktdatei[];
}

export function DateienManager({ produktId, initialItems }: Props) {
  const [items,  setItems]  = useState<Produktdatei[]>(initialItems);
  const [busy,   setBusy]   = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setFehler(null);
    try {
      // 1. Upload file
      const fd = new FormData();
      fd.append("datei", file);
      const upRes = await fetch("/api/upload/media", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Не удалось загрузить");

      // 2. Create DB entry
      const dbRes = await fetch("/api/produkt-dateien", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          produkt_id:   produktId,
          url:          upData.url,
          name:         file.name,
          dateigroesse: upData.dateigroesse,
        }),
      });
      const datei = await dbRes.json();
      if (!dbRes.ok) throw new Error(datei.error ?? "Не удалось сохранить");

      setItems(prev => [...prev, datei]);
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить файл? Это действие необратимо.")) return;
    const res = await fetch(`/api/produkt-dateien/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm font-sans text-vintage-dust italic">
          Нет загруженных файлов.
        </p>
      )}

      {items.map(d => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-2 px-4 py-3 bg-vintage-parchment/50 border border-vintage-sand"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-vintage-brown flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-vintage-ink truncate font-sans">{d.name}</p>
              {d.dateigroesse && (
                <p className="text-xs text-vintage-dust">{Math.round(d.dateigroesse / 1024)} КБ</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-white transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
              title="Открыть"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => handleDelete(d.id)}
              className="p-2 text-vintage-burgundy hover:bg-vintage-burgundy/10 transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      <div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="
            inline-flex items-center gap-2 px-4 py-2
            border border-vintage-sand text-vintage-brown
            text-xs font-sans uppercase tracking-widest
            hover:bg-vintage-parchment disabled:opacity-50 transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Загрузить PDF
        </button>
      </div>

      {fehler && <p className="text-xs text-vintage-burgundy font-sans">{fehler}</p>}
    </div>
  );
}
