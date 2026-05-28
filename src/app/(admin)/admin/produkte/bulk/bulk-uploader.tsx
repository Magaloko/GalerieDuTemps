"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Check, X, ArrowRight, CopyMinus } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * BulkUploader — viele Fotos → je Foto ein Draft-Produkt.
 *
 * Pro Datei sequenziell: SHA-256 (Dedup-Check) → POST /api/produkte (Draft) →
 * POST /api/bilder (Bild). Bereits vorhandene Bilder (gleicher Hash) werden
 * übersprungen — keine doppelten Drafts. Danach → Review-Queue.
 * Der Dateiname (ohne Endung) wird als Start-Name verwendet (Kontext).
 * ────────────────────────────────────────────────────────────────────────── */

type Status = "pending" | "uploading" | "done" | "error" | "duplicate";
interface Item { file: File; status: Status; error?: string }

/** SHA-256 der Originaldatei (Web Crypto) — identisch zum Server-Hash. */
async function sha256OfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const DRAFT_NAME = (f: File) => {
  const base = f.name.replace(/\.[^.]+$/, "").trim().slice(0, 120);
  return base.length >= 2 ? base : `Черновик · ${new Date().toLocaleString("ru-RU")}`;
};

export function BulkUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [fertig, setFertig] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    setItems(prev => [...prev, ...imgs.map(f => ({ file: f, status: "pending" as Status }))]);
    setFertig(false);
  };

  const setStatus = (i: number, status: Status, error?: string) =>
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, status, error } : it)));

  const start = async () => {
    if (running) return;
    setRunning(true); setDoneCount(0);
    let ok = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "done" || items[i].status === "duplicate") { ok++; continue; }
      setStatus(i, "uploading");
      try {
        // 0. Dedup: gleicher Bild-Hash schon vorhanden? → überspringen
        try {
          const hash = await sha256OfFile(items[i].file);
          const dr = await fetch(`/api/bilder/dedup?hash=${hash}`);
          const dj = await dr.json().catch(() => ({}));
          if (dj.duplicate) { setStatus(i, "duplicate", dj.name ?? undefined); ok++; continue; }
        } catch {/* Dedup-Fehler ist nicht fatal → normal weiter */}

        // 1. Draft anlegen
        const pr = await fetch("/api/produkte", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: DRAFT_NAME(items[i].file),
            preis: 1, zustand: "gut", lagerbestand: 1,
            aktiv: false, b2c_mode: "hidden", waehrung: "KZT",
          }),
        });
        if (!pr.ok) throw new Error(`Draft ${pr.status}`);
        const produkt = await pr.json();

        // 2. Bild anhängen
        const fd = new FormData();
        fd.append("datei", items[i].file);
        fd.append("produkt_id", produkt.id);
        fd.append("alt_text", DRAFT_NAME(items[i].file));
        const br = await fetch("/api/bilder", { method: "POST", body: fd });
        if (!br.ok) throw new Error(`Bild ${br.status}`);

        setStatus(i, "done"); ok++; setDoneCount(ok);
      } catch (err) {
        setStatus(i, "error", err instanceof Error ? err.message : "Ошибка");
      }
    }
    setRunning(false); setFertig(true);
  };

  const pending = items.filter(i => i.status !== "done" && i.status !== "duplicate").length;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        className="flex flex-col items-center justify-center gap-2 py-12 cursor-pointer border-2 border-dashed border-vintage-sand hover:bg-vintage-parchment transition-colors text-center"
        style={{ borderRadius: "var(--radius-card)" }}
      >
        <ImagePlus className="w-8 h-8 text-vintage-gold" />
        <p className="text-sm text-vintage-ink">Перетащите фото сюда или нажмите, чтобы выбрать</p>
        <p className="text-xs text-vintage-dust">Можно много за раз · только изображения</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); if (inputRef.current) inputRef.current.value = ""; }} />
      </div>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-vintage-dust">
              {items.length} фото · готово {doneCount}/{items.length}
            </p>
            {!fertig ? (
              <button type="button" onClick={start} disabled={running || pending === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase font-medium disabled:opacity-50"
                style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-vintage)" }}>
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                {running ? "Создаём…" : `Создать ${pending} черновик(ов)`}
              </button>
            ) : (
              <Link href="/admin/produkte/entwuerfe"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase font-medium"
                style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", borderRadius: "var(--radius-vintage)" }}>
                К черновикам <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-vintage-white border border-vintage-sand" style={{ borderRadius: "var(--radius-vintage)" }}>
                {it.status === "uploading" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-vintage-gold shrink-0" />
                 : it.status === "done"      ? <Check className="w-3.5 h-3.5 text-vintage-sage shrink-0" />
                 : it.status === "duplicate" ? <CopyMinus className="w-3.5 h-3.5 text-vintage-gold shrink-0" />
                 : it.status === "error"     ? <X className="w-3.5 h-3.5 text-vintage-burgundy shrink-0" />
                 : <span className="w-3.5 h-3.5 rounded-full border border-vintage-sand shrink-0" />}
                <span className="truncate flex-1 text-vintage-ink">{it.file.name}</span>
                {it.status === "duplicate" && <span className="text-vintage-gold shrink-0">дубликат — пропущено</span>}
                {it.status === "error" && <span className="text-vintage-burgundy">{it.error}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
