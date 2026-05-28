import Link from "next/link";
import { Calendar } from "lucide-react";
import type { JournalPost } from "@/types/newsletter";

/* ──────────────────────────────────────────────────────────────────────────
 * JournalPostCard — Magazine-Card für Journal-Index + Related-Posts.
 *
 * Varianten:
 *   - "default" — Standard-Card mit Cover, Tag, Titel, Excerpt, Datum
 *   - "compact" — Kleiner für Related-Section (Cover + Tag + Titel only)
 * ────────────────────────────────────────────────────────────────────────── */

interface Props {
  post:    JournalPost;
  bcp47:   string;
  variant?: "default" | "compact";
}

export function JournalPostCard({ post, bcp47, variant = "default" }: Props) {
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/journal/${post.slug}`}
      className="group block transition-shadow hover:shadow-soft"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      {post.cover_bild_url && (
        <div
          className="overflow-hidden"
          style={{
            aspectRatio: isCompact ? "4/3" : "16/10",
            background:  "var(--color-bone)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_bild_url}
            alt={post.titel}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className={isCompact ? "p-4" : "p-5"}>
        {post.tags.length > 0 && (
          <p
            className="text-[10px] uppercase font-medium mb-2"
            style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
          >
            {post.tags[0]}
          </p>
        )}
        <h2
          className={`transition-colors group-hover:text-[var(--color-coral)] ${isCompact ? "line-clamp-2" : "line-clamp-2"}`}
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   isCompact ? 16 : 20,
            color:      "var(--color-ink)",
            lineHeight: 1.2,
          }}
        >
          {post.titel}
        </h2>
        {!isCompact && post.excerpt && (
          <p
            className="text-sm mt-2 line-clamp-3"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.55,
            }}
          >
            {post.excerpt}
          </p>
        )}
        {post.veroeffentlicht_am && (
          <p
            className="flex items-center gap-1.5 text-[11px] mt-3"
            style={{ color: "var(--color-ink-mute)" }}
          >
            <Calendar className="w-3 h-3" />
            {new Date(post.veroeffentlicht_am).toLocaleDateString(bcp47, {
              day: "numeric", month: "long", year: "numeric",
            })}
          </p>
        )}
      </div>
    </Link>
  );
}
