"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Image as ImageIcon, Tv, ArrowRight, Loader2, ExternalLink, ShoppingBag, X } from "lucide-react";
import { InstagramIcon } from "@/components/produkte/instagram-icon";

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
  bild_url:       string | null;
};

/* ──────────────────────────────────────────────────────────────────────────
 * Instagram-Archiv (Mini-App) — IG-Galerie-Grid statt Embeds.
 *
 * Instagram embed.js wird in Telegrams WebView blockiert. Statt iframes zeigen
 * wir ein 2-spaltiges Raster quadratischer Cover-Kacheln (Instagram-Profil-Look).
 * Tippen öffnet ein Detail-Sheet mit großem Bild, Titel, Kategorie und den
 * Aktionen („Открыть в Instagram" + optional „К товару"). Kacheln mit
 * verknüpftem Produkt tragen ein Coral-Shopping-Badge (shoppable feed).
 * ────────────────────────────────────────────────────────────────────────── */
export function InstagramArchiveClient({
  posts, kategorien, aktiveKategorie,
}: { posts: Post[]; kategorien: Chip[]; aktiveKategorie: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<Post | null>(null);

  const navigate = (kat: string) => {
    const qs = kat ? `?kat=${encodeURIComponent(kat)}` : "";
    startTransition(() => router.push(`/tg/instagram${qs}`));
  };

  // Sheet schließen via Escape + Body-Scroll sperren solange offen.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setActive(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [active]);

  return (
    <main className="p-4 pb-8">
      <header className="mb-4">
        <p className="text-[10px] uppercase font-medium mb-2"
          style={{ letterSpacing: "0.28em", color: "var(--tg-theme-link-color, var(--color-coral))" }}>
          ✦ Из Instagram
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, lineHeight: 1.05, color: "var(--tg-theme-text-color, var(--color-ink))" }}>
          Архив
        </h1>
      </header>

      {/* Kategorie-Chips */}
      {kategorien.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <Chip label="Все" aktiv={!aktiveKategorie} onClick={() => navigate("")} />
          {kategorien.map(k => (
            <Chip key={k.slug} label={k.name} count={k.anzahl}
              aktiv={aktiveKategorie === k.slug}
              onClick={() => navigate(aktiveKategorie === k.slug ? "" : k.slug)} />
          ))}
          {pending && <Loader2 className="w-4 h-4 animate-spin shrink-0 self-center"
            style={{ color: "var(--color-ink-mute)" }} />}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="py-16 text-center">
          <p style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            Пока пусто.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2" style={{ opacity: pending ? 0.55 : 1 }}>
          {posts.map(p => <GridTile key={p.id} post={p} onOpen={() => setActive(p)} />)}
        </div>
      )}

      {/* Detail-Sheet */}
      {active && <DetailSheet post={active} onClose={() => setActive(null)} />}
    </main>
  );
}

function Chip({ label, count, aktiv, onClick }: {
  label: string; count?: number; aktiv: boolean; onClick: () => void;
}) {
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

const TYP_LABEL: Record<string, string> = { reel: "Reel", tv: "IGTV", p: "Post" };
function typIcon(typ: string) {
  return typ === "reel" ? Film : typ === "tv" ? Tv : ImageIcon;
}

/* ── Grid-Kachel (quadratisch, IG-Profil-Look) ── */
function GridTile({ post, onOpen }: { post: Post; onOpen: () => void }) {
  const Icon = typIcon(post.typ);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-full block"
      style={{
        aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", touchAction: "manipulation",
        border: "1px solid var(--color-line)",
        background: post.bild_url
          ? "var(--color-paper-warm, #f5f0e8)"
          : "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
      }}
    >
      {post.bild_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.bild_url} alt={post.titel ?? post.shortcode}
            className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          {/* Titel/Kategorie als dezentes Overlay unten */}
          {(post.titel || post.kategorie_name) && (
            <div className="absolute inset-x-0 bottom-0 p-2"
              style={{ background: "linear-gradient(to top, rgba(15,20,48,0.72), rgba(15,20,48,0))" }}>
              {post.kategorie_name && (
                <p className="text-[9px] uppercase font-medium mb-0.5 truncate"
                  style={{ letterSpacing: "0.16em", color: "rgba(255,255,255,0.82)" }}>
                  {post.kategorie_name}
                </p>
              )}
              {post.titel && (
                <p className="text-[12px] leading-tight line-clamp-2"
                  style={{ fontFamily: "var(--font-display)", color: "#fff" }}>
                  {post.titel}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        /* Kein Cover → IG-Gradient + Icon + Titel zentriert */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
          <InstagramIcon className="w-7 h-7" style={{ color: "rgba(255,255,255,0.92)" }} />
          <p className="text-[12px] leading-tight line-clamp-3"
            style={{ fontFamily: "var(--font-display)", color: "#fff" }}>
            {post.titel || post.shortcode}
          </p>
        </div>
      )}

      {/* Typ-Indikator oben links */}
      <span className="absolute top-1.5 left-1.5 flex items-center justify-center w-6 h-6 rounded-full"
        style={{ background: "rgba(15,20,48,0.55)", backdropFilter: "blur(2px)" }}>
        <Icon className="w-3 h-3" style={{ color: "#fff" }} />
      </span>

      {/* Coral-Shopping-Badge oben rechts (kaufbar) */}
      {post.produkt_slug && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-6 h-6 rounded-full shadow"
          style={{ background: "var(--color-coral)" }}>
          <ShoppingBag className="w-3 h-3" style={{ color: "#fff" }} />
        </span>
      )}
    </button>
  );
}

/* ── Detail-Sheet (Bottom-Sheet mit großem Bild + Aktionen) ── */
function DetailSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const Icon = typIcon(post.typ);
  const typLabel = TYP_LABEL[post.typ] ?? post.typ;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center"
      onClick={onClose}
      style={{ background: "rgba(10,12,30,0.62)", animation: "ig-fade-in 160ms ease-out" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto"
        style={{
          background: "var(--tg-theme-bg-color, var(--color-paper, #fff))",
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          animation: "ig-sheet-up 240ms cubic-bezier(0.2,0.7,0.3,1)",
        }}
      >
        {/* Drag-Handle + Close */}
        <div className="sticky top-0 flex items-center justify-between px-4 pt-3 pb-2"
          style={{ background: "var(--tg-theme-bg-color, var(--color-paper, #fff))" }}>
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-medium"
            style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            <Icon className="w-3.5 h-3.5" /> {typLabel}
          </span>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            className="p-1 -mr-1 opacity-60" style={{ touchAction: "manipulation" }}>
            <X className="w-5 h-5" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }} />
          </button>
        </div>

        {/* Großes Cover */}
        <div className="relative w-full mx-auto"
          style={{ aspectRatio: "4/5", maxWidth: 420,
            background: post.bild_url ? "var(--color-paper-warm, #f5f0e8)"
              : "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
          {post.bild_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.bild_url} alt={post.titel ?? post.shortcode}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <InstagramIcon className="w-12 h-12" style={{ color: "rgba(255,255,255,0.92)" }} />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="px-4 pt-4">
          {post.kategorie_name && (
            <p className="text-[10px] uppercase font-medium mb-1"
              style={{ letterSpacing: "0.18em", color: "var(--color-coral)" }}>
              {post.kategorie_name}
            </p>
          )}
          <p className="text-lg leading-snug"
            style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
            {post.titel || post.shortcode}
          </p>
        </div>

        {/* Aktionen */}
        <div className="px-4 pt-4 flex flex-col gap-2">
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 text-[12px] uppercase font-medium"
            style={{
              letterSpacing: "0.16em", borderRadius: 8, touchAction: "manipulation",
              border: "1px solid var(--color-coral)", color: "var(--color-coral)",
            }}>
            <ExternalLink className="w-4 h-4" />
            Открыть в Instagram
          </a>

          {post.produkt_slug && (
            <Link
              href={`/tg/produkt/${post.produkt_slug}`}
              className="flex items-center justify-center gap-2 py-3 text-[12px] uppercase font-medium"
              style={{
                letterSpacing: "0.16em", borderRadius: 8, touchAction: "manipulation",
                background: "var(--color-coral)", color: "#fff",
              }}>
              <ShoppingBag className="w-4 h-4" />
              {post.produkt_name ? `К товару: ${post.produkt_name}` : "К товару"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ig-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ig-sheet-up { from { transform: translateY(12%); opacity: 0.6 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
