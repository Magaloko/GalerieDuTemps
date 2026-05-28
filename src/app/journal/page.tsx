import Link from "next/link";
import { veroeffentlichtePosts } from "@/lib/db/journal";
import { JournalPostCard } from "@/components/journal/post-card";
import { BookOpen, ArrowRight, Calendar } from "lucide-react";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title:       "Журнал",
  description: "Истории, советы по уходу и тренды винтажа.",
  alternates:  { canonical: "/journal" },
};

export const revalidate = 600;

export default async function JournalPage() {
  const [posts, { t, locale }] = await Promise.all([
    veroeffentlichtePosts(50).catch(() => []),
    getDictionary(),
  ]);
  const bcp47 = locale === "kz" ? "ru-RU" : locale === "en" ? "en-US" : "ru-RU";

  // Featured: erster Post mit Cover (für Magazine-Hero), Rest als Grid
  const featured = posts.find(p => !!p.cover_bild_url) ?? posts[0] ?? null;
  const rest     = featured
    ? posts.filter(p => p.id !== featured.id)
    : posts;

  return (
    <div
      style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}
      className="min-h-[100dvh]"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-14 py-10 md:py-16">

        {/* ─── Hero ─────────────────────────────────────────── */}
        <header className="text-center mb-12 md:mb-16">
          <p
            className="text-[11px] uppercase font-medium mb-3"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ {t.journal_seite.eyebrow}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   "clamp(2.5rem, 6vw, 4rem)",
              color:      "var(--color-ink)",
              lineHeight: 1.05,
            }}
          >
            {t.journal_seite.titel.split(" ").map((word, i, arr) => (
              i === arr.length - 1 ? (
                <em
                  key={i}
                  style={{
                    fontFamily: "var(--font-italic)",
                    fontStyle:  "italic",
                    color:      "var(--color-coral)",
                  }}
                >
                  {word}
                </em>
              ) : <span key={i}>{word} </span>
            ))}
          </h1>
          <p
            className="text-base mt-4 max-w-xl mx-auto"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-soft)",
              lineHeight: 1.6,
            }}
          >
            {t.journal_seite.untertitel}
          </p>
        </header>

        {posts.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <>
            {/* ─── Featured Hero-Post ────────────────────────── */}
            {featured && featured.cover_bild_url && (
              <Link
                href={`/journal/${featured.slug}`}
                className="group grid md:grid-cols-2 gap-6 md:gap-10 mb-16 transition-opacity"
                style={{
                  background: "#fff",
                  border:     "1px solid var(--color-line)",
                }}
              >
                <div
                  className="overflow-hidden"
                  style={{
                    aspectRatio: "4/3",
                    background:  "var(--color-bone)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.cover_bild_url}
                    alt={featured.titel}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-col justify-center px-6 md:px-8 pb-8 md:py-8">
                  <p
                    className="text-[11px] uppercase font-medium mb-3 flex items-center gap-2"
                    style={{ letterSpacing: "0.22em", color: "var(--color-coral)" }}
                  >
                    ✦ Главное · {featured.tags[0] ?? "статья"}
                  </p>
                  <h2
                    className="transition-colors group-hover:text-[var(--color-coral)]"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize:   "clamp(1.75rem, 3.5vw, 2.5rem)",
                      color:      "var(--color-ink)",
                      lineHeight: 1.15,
                    }}
                  >
                    {featured.titel}
                  </h2>
                  {featured.excerpt && (
                    <p
                      className="mt-4 text-base line-clamp-3"
                      style={{
                        fontFamily: "var(--font-italic)",
                        fontStyle:  "italic",
                        color:      "var(--color-ink-soft)",
                        lineHeight: 1.6,
                      }}
                    >
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-5">
                    {featured.veroeffentlicht_am && (
                      <span
                        className="flex items-center gap-1.5 text-[11px]"
                        style={{ color: "var(--color-ink-mute)" }}
                      >
                        <Calendar className="w-3 h-3" />
                        {new Date(featured.veroeffentlicht_am).toLocaleDateString(bcp47, {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 text-[11px] uppercase font-medium transition-colors group-hover:text-[var(--color-coral)]"
                      style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
                    >
                      Читать <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* ─── Rest in Grid ──────────────────────────────── */}
            {rest.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map(p => (
                  <JournalPostCard key={p.id} post={p} bcp47={bcp47} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ t }: { t: Awaited<ReturnType<typeof getDictionary>>["t"] }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      style={{
        background: "#fff",
        border:     "1px solid var(--color-line)",
      }}
    >
      <div
        className="inline-flex items-center justify-center mb-5"
        style={{
          width:        72,
          height:       72,
          background:   "var(--color-bone)",
          borderRadius: "50%",
        }}
      >
        <BookOpen className="w-7 h-7" style={{ color: "var(--color-ink-mute)" }} />
      </div>
      <p
        className="mb-1"
        style={{
          fontFamily: "var(--font-display)",
          fontSize:   18,
          color:      "var(--color-ink)",
        }}
      >
        {t.journal_seite.keine_beitraege}
      </p>
      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
        }}
      >
        {t.journal_seite.bald_wieder}
      </p>
    </div>
  );
}
