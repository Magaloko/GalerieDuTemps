"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Film, Image as ImageIcon, Tv, ArrowRight, Loader2, ExternalLink } from "lucide-react";
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
};

/* ──────────────────────────────────────────────────────────────────────────
 * Instagram-Archiv (Mini-App) — native Karten statt Embeds.
 *
 * Instagram embed.js wird in Telegramms WebView blockiert. Deshalb zeigen
 * wir marken-konforme Karten mit direktem Link zum Post — kein iframe, kein
 * externes Script. Funktioniert zuverlässig in allen Umgebungen.
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
        <div className="flex flex-col gap-3" style={{ opacity: pending ? 0.55 : 1 }}>
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      )}
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

function PostCard({ post }: { post: Post }) {
  const Icon = post.typ === "reel" ? Film : post.typ === "tv" ? Tv : ImageIcon;

  return (
    <div style={{
      background: "var(--tg-theme-section-bg-color, #fff)",
      border:     "1px solid var(--color-line)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* Header: IG-Icon + Typ-Badge + Titel */}
      <div className="flex items-start gap-3 p-3">
        {/* IG-Farbverlauf-Icon */}
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
          <InstagramIcon className="w-5 h-5" style={{ color: "#fff" }} />
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          {/* Kategorie + Typ */}
          <div className="flex items-center gap-2 mb-0.5">
            {post.kategorie_name && (
              <span className="text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.18em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
                {post.kategorie_name}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
              <Icon className="w-3 h-3" />
              {TYP_LABEL[post.typ] ?? post.typ}
            </span>
          </div>
          {/* Titel */}
          <p className="text-sm leading-snug"
            style={{ fontFamily: "var(--font-display)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
            {post.titel || post.shortcode}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-0" style={{ borderTop: "1px solid var(--color-line)" }}>
        {/* In Instagram öffnen */}
        <a
          href={post.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.18em",
            color: "var(--color-coral)",
            touchAction: "manipulation",
          }}>
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть в Instagram
        </a>

        {/* Zum Produkt — wenn verknüpft */}
        {post.produkt_slug && (
          <Link
            href={`/tg/produkt/${post.produkt_slug}`}
            className="flex items-center justify-center gap-2 py-2.5 text-[11px] uppercase font-medium"
            style={{
              borderTop: "1px solid var(--color-line)",
              letterSpacing: "0.18em",
              background: "var(--color-coral)",
              color: "#fff",
              touchAction: "manipulation",
            }}>
            {post.produkt_name ? `К товару: ${post.produkt_name}` : "К товару"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
