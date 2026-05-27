"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { Save, Loader2, Check, AlertCircle, RotateCcw, Upload, Monitor, Smartphone } from "lucide-react";
import { saveThemeAction } from "./actions";
import type { ThemeSetting } from "@/lib/db/theme";

interface Props {
  settings: ThemeSetting[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * DesignCustomizer
 *
 * Split-View:
 *   Links  — Editor mit Color-Pickern + Branding-Inputs + Save-Button
 *   Rechts — Iframe-Preview der Homepage, refreshed bei "Сохранить"
 *
 * Live-Preview-Strategie: WÄHREND der Picker-Bewegung wird nur das lokale
 * Editor-Vorschau-Swatch aktualisiert (CSS-Variable im Editor-Wrapper). Erst
 * beim Sichern → DB-Save → Iframe-Reload zeigt die echte Site mit neuen Farben.
 *
 * Reset: zurück zu Code-Default-Werten (aus globals.css), erfordert manuelles
 * Klicken auf Reset pro Token oder "Alle zurück".
 * ────────────────────────────────────────────────────────────────────────── */
export function DesignCustomizer({ settings }: Props) {
  const [werte, setWerte]     = useState<Record<string, string>>(
    Object.fromEntries(settings.map(s => [s.schluessel, s.wert]))
  );
  const [original]            = useState<Record<string, string>>(
    Object.fromEntries(settings.map(s => [s.schluessel, s.wert]))
  );
  const [pending, startTransition] = useTransition();
  const [result,  setResult]  = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Patch = nur veränderte Werte
  const dirty = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(werte)) {
      if (werte[k] !== original[k]) out[k] = werte[k];
    }
    return out;
  }, [werte, original]);
  const dirtyCount = Object.keys(dirty).length;

  const setValue = (key: string, value: string) => {
    setWerte(prev => ({ ...prev, [key]: value }));
    setResult("idle");
  };

  const resetOne = (key: string) => setValue(key, original[key]);
  const resetAll = () => setWerte({ ...original });

  const save = () => {
    if (dirtyCount === 0) return;
    setResult("idle");
    setErrorMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("patch", JSON.stringify(dirty));
      const r = await saveThemeAction(null, fd);
      if (r.ok) {
        setResult("ok");
        // Iframe reload damit die echte Site mit neuen Farben angezeigt wird.
        // Plus 500ms delay damit revalidatePath() seinen Cache geleert hat.
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
          }
        }, 600);
        setTimeout(() => setResult("idle"), 2500);
      } else {
        setResult("error");
        setErrorMsg(r.error);
      }
    });
  };

  // Groups
  const colors    = settings.filter(s => s.gruppe === "colors");
  const branding  = settings.filter(s => s.gruppe === "branding");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">

      {/* ─── EDITOR ─────────────────────────────────────────────────── */}
      <div className="space-y-5">

        {/* Save-Bar (sticky) */}
        <div
          className="sticky top-16 z-10 -mx-4 px-4 py-3 flex items-center gap-3 flex-wrap"
          style={{
            background:   "rgba(245,241,234,0.96)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid var(--color-line)",
          }}
        >
          <button
            type="button"
            onClick={save}
            disabled={dirtyCount === 0 || pending}
            className="btn-coral inline-flex items-center gap-2"
            style={{ minHeight: 42, touchAction: "manipulation" }}
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {!pending && result === "ok"    && <Check className="w-4 h-4" />}
            {!pending && result === "error" && <AlertCircle className="w-4 h-4" />}
            {!pending && result === "idle"  && <Save className="w-4 h-4" />}
            {pending ? "Сохранение…" : result === "ok" ? "Сохранено" : "Сохранить"}
            {dirtyCount > 0 && result !== "ok" && (
              <span
                className="ml-1 px-1.5 text-[10px]"
                style={{ background: "rgba(255,255,255,0.25)", borderRadius: 2 }}
              >
                {dirtyCount}
              </span>
            )}
          </button>

          {dirtyCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="text-[11px] uppercase font-medium px-3 py-2 transition-opacity hover:opacity-70 inline-flex items-center gap-1"
              style={{
                letterSpacing: "0.18em",
                color:         "var(--color-ink-soft)",
                border:        "1px solid var(--color-line)",
                touchAction:   "manipulation",
              }}
            >
              <RotateCcw className="w-3 h-3" /> Отменить
            </button>
          )}

          {errorMsg && (
            <p className="text-[12px] w-full mt-1" style={{ color: "var(--color-coral-deep)" }}>
              <AlertCircle className="inline w-3.5 h-3.5 mr-1" />
              {errorMsg}
            </p>
          )}
        </div>

        {/* Color-Sektion */}
        <Section title="Цвета">
          <div className="space-y-3">
            {colors.map(s => (
              <ColorRow
                key={s.schluessel}
                setting={s}
                value={werte[s.schluessel]}
                onChange={v => setValue(s.schluessel, v)}
                onReset={() => resetOne(s.schluessel)}
                isDirty={werte[s.schluessel] !== original[s.schluessel]}
              />
            ))}
          </div>
        </Section>

        {/* Branding-Sektion */}
        <Section title="Бренд">
          <div className="space-y-3">
            {branding.map(s => (
              <BrandingRow
                key={s.schluessel}
                setting={s}
                value={werte[s.schluessel]}
                onChange={v => setValue(s.schluessel, v)}
                onReset={() => resetOne(s.schluessel)}
                isDirty={werte[s.schluessel] !== original[s.schluessel]}
              />
            ))}
          </div>
        </Section>
      </div>

      {/* ─── PREVIEW ────────────────────────────────────────────────── */}
      <div className="lg:sticky lg:top-16 self-start">
        <div
          className="flex items-center justify-between gap-3 mb-3 px-1"
          style={{ minHeight: 42 }}
        >
          <p
            className="text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
          >
            Превью · Главная страница
          </p>
          <div className="flex gap-1">
            <PreviewToggle active={previewMode === "desktop"} onClick={() => setPreviewMode("desktop")} icon={<Monitor className="w-3.5 h-3.5" />} label="Desktop" />
            <PreviewToggle active={previewMode === "mobile"}  onClick={() => setPreviewMode("mobile")}  icon={<Smartphone className="w-3.5 h-3.5" />} label="Mobile"  />
          </div>
        </div>
        <div
          className="overflow-hidden mx-auto transition-all"
          style={{
            background:   "var(--color-bone)",
            border:       "1px solid var(--color-line)",
            width:        previewMode === "mobile" ? 390 : "100%",
            maxWidth:     "100%",
          }}
        >
          <iframe
            ref={iframeRef}
            src="/"
            className="w-full bg-white"
            style={{ height: "calc(100vh - 220px)", border: 0 }}
            title="Превью сайта"
          />
        </div>
        <p
          className="mt-3 px-1 text-[12px]"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-mute)",
          }}
        >
          После нажатия «Сохранить» превью обновится автоматически с новыми цветами.
        </p>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5" style={{ background: "#fff", border: "1px solid var(--color-line)" }}>
      <h2
        className="mb-4 pb-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   18,
          color:      "var(--color-ink)",
          borderBottom: "1px solid var(--color-line)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorRow({
  setting, value, onChange, onReset, isDirty,
}: {
  setting:  ThemeSetting;
  value:    string;
  onChange: (v: string) => void;
  onReset:  () => void;
  isDirty:  boolean;
}) {
  const tokenName = setting.schluessel.replace(/^color\./, "");
  return (
    <div
      className="flex items-center gap-3 p-2"
      style={{
        background: isDirty ? "rgba(232,112,58,0.04)" : "transparent",
        border:     isDirty ? "1px solid rgba(232,112,58,0.25)" : "1px solid transparent",
      }}
    >
      {/* Swatch + Picker */}
      <label className="relative cursor-pointer shrink-0" style={{ width: 36, height: 36 }}>
        <span
          aria-hidden
          className="block"
          style={{
            width: 36, height: 36,
            background:   value,
            border:       "1px solid var(--color-line)",
            borderRadius: 2,
          }}
        />
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ touchAction: "manipulation" }}
        />
      </label>

      {/* Label + Description */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", color: "var(--color-ink-soft)" }}
        >
          {tokenName}
        </p>
        {setting.beschreibung && (
          <p
            className="text-[11px] truncate"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            {setting.beschreibung}
          </p>
        )}
      </div>

      {/* Hex-Input */}
      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value.toUpperCase();
          // Live-Update wenn valid Hex; sonst speichern wir aber rotmarkieren
          onChange(v);
        }}
        maxLength={7}
        className="w-[88px] px-2 py-1.5 text-[12px] text-center"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--color-bone)",
          border:     /^#[0-9a-fA-F]{6}$/.test(value)
            ? "1px solid var(--color-line)"
            : "1px solid var(--color-coral-deep)",
          color:      "var(--color-ink)",
          borderRadius: 0,
        }}
      />

      {isDirty && (
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-ink-mute)", touchAction: "manipulation" }}
          title="Сбросить"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function BrandingRow({
  setting, value, onChange, onReset, isDirty,
}: {
  setting:  ThemeSetting;
  value:    string;
  onChange: (v: string) => void;
  onReset:  () => void;
  isDirty:  boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("datei", file);
      const r = await fetch("/api/upload/media", { method: "POST", body: fd });
      const data = await r.json();
      if (r.ok && data.url) {
        onChange(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="p-3"
      style={{
        background: isDirty ? "rgba(232,112,58,0.04)" : "transparent",
        border:     isDirty ? "1px solid rgba(232,112,58,0.25)" : "1px solid transparent",
      }}
    >
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <p
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", color: "var(--color-ink-soft)" }}
        >
          {setting.schluessel.replace(/^brand\./, "")}
        </p>
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="p-1 transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-mute)" }}
            title="Сбросить"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
      {setting.beschreibung && (
        <p
          className="text-[12px] mb-2"
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-mute)",
          }}
        >
          {setting.beschreibung}
        </p>
      )}

      {setting.typ === "toggle" ? (
        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-ink)" }}>
          <input
            type="checkbox"
            checked={value !== "false"}
            onChange={e => onChange(e.target.checked ? "true" : "false")}
            style={{ width: 18, height: 18, accentColor: "var(--color-coral)" }}
          />
          {value === "false" ? "Выключено" : "Включено"}
        </label>
      ) : setting.typ === "url" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={setting.schluessel.includes("logo") ? "https://… .png" : "/favicon.ico"}
            className="flex-1 px-3 py-2 text-[13px]"
            style={{
              background: "var(--color-bone)", border: "1px solid var(--color-line)",
              color:      "var(--color-ink)", fontFamily: "var(--font-mono)",
              borderRadius: 0,
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept={setting.schluessel.includes("favicon") ? "image/x-icon,image/png" : "image/*"}
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 text-[11px] uppercase font-medium inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{
              letterSpacing: "0.18em",
              background:    "var(--color-coral)",
              color:         "#fff",
              touchAction:   "manipulation",
            }}
          >
            {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {uploading ? "…" : "Загрузить"}
          </button>
        </div>
      ) : (
        // 'text'
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={value.length > 60 ? 3 : 1}
          className="w-full px-3 py-2 text-[13px]"
          style={{
            background:   "var(--color-bone)", border: "1px solid var(--color-line)",
            color:        "var(--color-ink)",
            borderRadius: 0,
            resize:       "vertical",
          }}
        />
      )}

      {/* Bild-Preview wenn URL */}
      {setting.typ === "url" && value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 max-h-12 inline-block"
          style={{ background: "var(--color-paper)", padding: 4 }}
          onError={e => { e.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}

function PreviewToggle({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase font-medium transition-colors"
      style={{
        letterSpacing: "0.18em",
        background:    active ? "var(--color-coral)" : "transparent",
        color:         active ? "#fff" : "var(--color-ink-soft)",
        border:        `1px solid ${active ? "var(--color-coral)" : "var(--color-line)"}`,
        touchAction:   "manipulation",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
