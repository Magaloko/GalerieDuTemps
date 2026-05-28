"use client";

import { useEffect, useState, useTransition } from "react";
import { Image as ImageIcon, Check, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import {
  telegramWelcomeImageGetAction,
  telegramWelcomeImageSetAction,
} from "./actions";

/* ──────────────────────────────────────────────────────────────────────────
 * WelcomeImageClient — Bild der /start-Begrüßungsnachricht editieren.
 *
 * Speichert via Marketing-String „telegram.welcome.image". URL absolut
 * (https://...) oder relativ (/images/foo.jpg). Leer = Default hero-stack-1.
 * Live-Preview des eingegebenen Bildes.
 * ────────────────────────────────────────────────────────────────────────── */
export function WelcomeImageClient() {
  const [url, setUrl]       = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, start]    = useTransition();
  const [msg, setMsg]       = useState<string | null>(null);
  const [err, setErr]       = useState<string | null>(null);

  useEffect(() => {
    telegramWelcomeImageGetAction()
      .then(v => setUrl(v))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const save = () => {
    setMsg(null); setErr(null);
    start(async () => {
      const r = await telegramWelcomeImageSetAction(url);
      if (r.ok) setMsg(r.message ?? "Сохранено");
      else setErr(r.error);
    });
  };

  const reset = () => {
    setUrl("");
    setMsg(null); setErr(null);
    start(async () => {
      const r = await telegramWelcomeImageSetAction("");
      if (r.ok) setMsg(r.message ?? "Сброшено");
      else setErr(r.error);
    });
  };

  // Preview-URL: relativer Pfad → mit Origin; absolut → wie ist; leer → Default
  const previewSrc = url
    ? (url.startsWith("http") ? url : url)
    : "/images/hero-stack-1.jpg";

  return (
    <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4"
             style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-vintage-gold" />
        <h3 className="font-serif text-base text-vintage-espresso">Картинка приветствия</h3>
      </div>
      <p className="text-sm text-vintage-dust font-sans">
        Изображение, которое бот отправляет при <code className="bg-vintage-parchment px-1.5 py-0.5 text-xs">/start</code>.
        Вставьте ссылку (https://…) или путь к файлу на сайте (например <code className="bg-vintage-parchment px-1.5 py-0.5 text-xs">/images/hero-stack-2.jpg</code>).
        Пусто = картинка по умолчанию.
      </p>

      {!loaded ? (
        <div className="flex items-center gap-2 text-sm text-vintage-dust">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка…
        </div>
      ) : (
        <>
          {/* Live-Preview */}
          <div className="flex items-start gap-4">
            <div
              className="w-32 h-32 flex-shrink-0 overflow-hidden bg-vintage-parchment border border-vintage-sand"
              style={{ borderRadius: "var(--radius-vintage)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc} alt="Превью" className="w-full h-full object-cover"
                   onError={e => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="/images/hero-stack-1.jpg или https://…"
                className="w-full px-3 py-2 text-sm font-mono bg-vintage-parchment border border-vintage-sand text-vintage-ink focus:outline-none focus:border-vintage-brown"
                style={{ borderRadius: "var(--radius-vintage)" }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={save}
                  disabled={pending}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50"
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Сохранить
                </button>
                <button
                  onClick={reset}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-sans uppercase tracking-widest text-vintage-dust hover:text-vintage-brown transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Сбросить
                </button>
              </div>
            </div>
          </div>

          {/* Schnellauswahl bestehender Bilder */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-vintage-dust font-sans self-center">Быстрый выбор:</span>
            {["/images/hero-stack-1.jpg","/images/hero-stack-2.jpg","/images/hero-stack-3.jpg","/images/hero-stack-4.jpg","/images/hero-stack-5.jpg"].map(p => (
              <button
                key={p}
                onClick={() => setUrl(p)}
                className="w-12 h-12 overflow-hidden border-2 transition-all"
                style={{
                  borderColor: url === p ? "var(--color-coral)" : "transparent",
                  borderRadius: "var(--radius-vintage)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}

      {msg && (
        <div className="flex items-start gap-2 px-3 py-2 bg-vintage-sage/10 border border-vintage-sage/30 text-sm text-vintage-forest"
             style={{ borderRadius: "var(--radius-vintage)" }}>
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{msg}</span>
        </div>
      )}
      {err && (
        <div className="flex items-start gap-2 px-3 py-2 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{err}</span>
        </div>
      )}
    </section>
  );
}
