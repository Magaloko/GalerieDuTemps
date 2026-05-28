"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Film, Image as ImageIcon, ArrowRight, Loader2 } from "lucide-react";

type Chip = { slug: string; name: string; anzahl: number };
type Post = {
  id:             string;
  permalink:      string;
  shortcode:      string;
  typ:            "p" | "reel" | "tv";
  titel:          string | null;
  kategorie_name: string | null;
  produkt_slug:   string | null;
  produkt_name:   string | null;
};

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Instagram-Archiv (Mini-App) — Kategorie-Chips + Lazy-Feed.
 *
 * Performance: echte IG-Embeds sind schwer. Jeder Post rendert erst, wenn er
 * via IntersectionObserver in den Viewport kommt (LazyEmbed) — bis dahin nur
 * eine leichte Platzhalter-Karte. embed.js wird einmal pro Seite geladen.
 * ────────────────────────────────────────────────────────────────────────── */
export function InstagramArchiveClient({
  posts, kategorien, aktiveKategorie,
}: { posts: Post[]; kategorien: Chip[]; aktiveKategorie: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = (kat: string) => {
    const qs = kat ? `?kat=${encodeURIComponent(kat)}` : "";
    startTransition(() => router.push(`/tg/instagram${qs}`));
  };

  return (
    <main className="p-4">
      <header className="mb-4">
        <p className="text-[10px] uppercase font-medium mb-2" style={{ letterSpacing: "0.28em", color: "var(--tg-theme-link-color, var(--color-coral))" }}>
          ✦ Из Instagram
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.05, color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          Архив
        </h1>
      </header>

      {/* Kategorie-Chips */}
      {kategorien.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <Chip label="Все" aktiv={!aktiveKategorie} onClick={() => navigate("")} />
          {kategorien.map(k => (
            <Chip key={k.slug} label={k.name} count={k.anzahl} aktiv={aktiveKategorie === k.slug}
              onClick={() => navigate(aktiveKategorie === k.slug ? "" : k.slug)} />
          ))}
          {pending && <Loader2 className="w-4 h-4 animate-spin shrink-0 self-center" style={{ color: "var(--color-ink-mute)" }} />}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="py-16 text-center">
          <p style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>Пока пусто.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5" style={{ opacity: pending ? 0.55 : 1 }}>
          {posts.map(p => <LazyEmbed key={p.id} post={p} />)}
        </div>
      )}

      {/* embed.js einmal pro Seite — lazyOnload. */}
      <Script
        id="instagram-embed-js"
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => { try { window.instgrm?.Embeds?.process(); } catch { /* ignore */ } }}
      />
    </main>
  );
}

function Chip({ label, count, aktiv, onClick }: { label: string; count?: number; aktiv: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 px-3 py-1.5 text-[11px] uppercase font-medium whitespace-nowrap"
      style={{
        letterSpacing: "0.12em", borderRadius: 999, touchAction: "manipulation",
        background: aktiv ? "var(--color-coral)" : "var(--tg-theme-section-bg-color, #fff)",
        color:      aktiv ? "#fff" : "var(--tg-theme-text-color, var(--color-ink))",
        border:     `1px solid ${aktiv ? "var(--color-coral)" : "var(--color-line)"}`,
      }}>
      {label}{count !== undefined ? ` · ${count}` : ""}
    </button>
  );
}

/* Rendert das echte IG-Embed erst, wenn die Karte in den Viewport scrollt. */
function LazyEmbed({ post }: { post: Post }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { setShow(true); io.disconnect(); }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  // Sobald sichtbar → blockquote rendern und embed.js neu prozessieren.
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => { try { window.instgrm?.Embeds?.process(); } catch { /* ignore */ } }, 100);
    return () => window.clearTimeout(t);
  }, [show]);

  const Icon = post.typ === "reel" ? Film : ImageIcon;

  return (
    <div ref={ref} className="w-full" style={{ maxWidth: 540 }}>
      {show ? (
        <blockquote
          className="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink={post.permalink}
          data-instgrm-version="14"
          style={{ background: "#FFF", border: 0, borderRadius: 3, boxShadow: "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)", margin: 0, maxWidth: 540, minWidth: 280, padding: 0, width: "100%" }}
        >
          <div style={{ padding: 16 }}>
            <a href={post.permalink} target="_blank" rel="noopener noreferrer" style={{ color: "#3897f0", textDecoration: "none", fontSize: 14 }}>
              Открыть в Instagram →
            </a>
          </div>
        </blockquote>
      ) : (
        /* Leichter Platzhalter bis sichtbar */
        <div className="flex items-center gap-3 p-4 w-full"
          style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", borderRadius: 3, minHeight: 88 }}>
          <Icon className="w-5 h-5 shrink-0" style={{ color: "var(--color-coral)" }} />
          <div className="min-w-0">
            {post.kategorie_name && (
              <p className="text-[10px] uppercase font-medium" style={{ letterSpacing: "0.2em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                {post.kategorie_name}
              </p>
            )}
            <p className="text-sm truncate" style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
              {post.titel || post.shortcode}
            </p>
          </div>
        </div>
      )}

      {/* „Zum Produkt" wenn verknüpft */}
      {post.produkt_slug && (
        <Link href={`/tg/produkt/${post.produkt_slug}`}
          className="mt-2 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.18em", background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-coral)", color: "var(--color-coral)", touchAction: "manipulation" }}>
          Перейти к товару <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}
