"use client";

import { useRef, useState } from "react";
import { Upload, Trash2, Loader2, Award, ExternalLink } from "lucide-react";
import type { Produktzertifikat } from "@/types/produkt";

interface Props {
  produktId:     string;
  initialItems:  Produktzertifikat[];
}

export function ZertifikateManager({ produktId, initialItems }: Props) {
  const [items,  setItems]  = useState<Produktzertifikat[]>(initialItems);
  const [busy,   setBusy]   = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [name,       setName]       = useState("");
  const [aussteller, setAussteller] = useState("");
  const [datum,      setDatum]      = useState("");
  const [url,        setUrl]        = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setBusy(true);
    setFehler(null);
    try {
      const fd = new FormData();
      fd.append("datei", file);
      const upRes = await fetch("/api/upload/media", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Не удалось загрузить");
      setUrl(upData.url);
      if (!name) setName(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!url || !name) {
      setFehler("Сначала загрузите файл и введите название");
      return;
    }
    setBusy(true);
    setFehler(null);
    try {
      const res = await fetch("/api/produkt-zertifikate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          produkt_id: produktId,
          url, name,
          aussteller: aussteller || undefined,
          datum:      datum      || undefined,
        }),
      });
      const z = await res.json();
      if (!res.ok) throw new Error(z.error ?? "Не удалось сохранить");
      setItems(prev => [...prev, z]);
      setName(""); setAussteller(""); setDatum(""); setUrl("");
    } catch (err) {
      setFehler(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить сертификат? Это действие необратимо.")) return;
    const res = await fetch(`/api/produkt-zertifikate/${id}`, { method: "DELETE" });
    if (res.ok) setItems(prev => prev.filter(z => z.id !== id));
  };

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm font-sans text-vintage-dust italic">
          Нет загруженных сертификатов.
        </p>
      )}

      {items.map(z => (
        <div
          key={z.id}
          className="flex items-center justify-between gap-2 px-4 py-3 bg-vintage-gold/5 border border-vintage-gold/30"
          style={{ borderRadius: "var(--radius-vintage)" }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Award className="w-4 h-4 text-vintage-gold flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-vintage-ink truncate font-serif">{z.name}</p>
              {(z.aussteller || z.datum) && (
                <p className="text-xs text-vintage-dust">
                  {[z.aussteller, z.datum].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={z.url}
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
              onClick={() => handleDelete(z.id)}
              className="p-2 text-vintage-burgundy hover:bg-vintage-burgundy/10 transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Add form */}
      <div className="border-t border-vintage-sand/40 pt-4 space-y-3">
        <p className="text-xs uppercase tracking-widest text-vintage-brown font-sans">
          Добавить сертификат
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment disabled:opacity-50 transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {url ? "Файл загружен" : "Загрузить файл"}
          </button>
          {url && <span className="text-xs text-vintage-sage font-sans">✓ {url.split("/").pop()}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Название (напр. ISO 9001)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown"
            style={{ borderRadius: "var(--radius-vintage)" }}
          />
          <input
            type="text"
            placeholder="Эмитент"
            value={aussteller}
            onChange={(e) => setAussteller(e.target.value)}
            className="px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown"
            style={{ borderRadius: "var(--radius-vintage)" }}
          />
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="px-3 py-2 bg-vintage-cream border border-vintage-sand text-sm font-sans text-vintage-ink focus:outline-none focus:border-vintage-brown"
            style={{ borderRadius: "var(--radius-vintage)" }}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !url || !name}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown disabled:opacity-50 transition-colors"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Сохранить сертификат
        </button>
      </div>

      {fehler && <p className="text-xs text-vintage-burgundy font-sans">{fehler}</p>}
    </div>
  );
}
