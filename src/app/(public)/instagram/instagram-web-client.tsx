"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { ArrowRight } from "lucide-react";

interface WebPost {
  id:           string;
  permalink:    string;
  shortcode:    string;
  titel:        string | null;
  produkt_slug: string | null;
  produkt_name: string | null;
}

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Web-Instagram-Archiv — rendert die kuratierten Posts als IG-Embeds.
 *
 * Reuse des bewährten Embed-Mechanismus (blockquote + embed.js + process()).
 * Verknüpfte Produkte bekommen einen „К товару"-Link unter dem Embed.
 * Kategorie-Filter läuft server-seitig über ?kat= (Chips als Links).
 * ────────────────────────────────────────────────────────────────────────── */
export function InstagramWebClient({ posts }: { posts: WebPost[] }) {
  useEffect(() => {
    if (posts.length === 0) return;
    const t = window.setTimeout(() => {
      try { window.instgrm?.Embeds?.process(); } catch { /* embed.js lädt noch */ }
    }, 150);
    return () => window.clearTimeout(t);
  }, [posts]);

  if (posts.length === 0) {
    return (
      <p className="text-center text-vintage-dust font-sans py-16">
        В этой категории пока нет постов.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-8 justify-center">
        {posts.map(p => (
          <div key={p.id} className="w-full" style={{ maxWidth: 540 }}>
            <blockquote
              className="instagram-media"
              data-instgrm-captioned
              data-instgrm-permalink={p.permalink}
              data-instgrm-version="14"
              style={{
                background: "#FFF", border: 0, borderRadius: 3,
                boxShadow: "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
                margin: 0, maxWidth: 540, minWidth: 280, padding: 0, width: "100%",
              }}
            >
              <div style={{ padding: 16 }}>
                <a href={p.permalink} target="_blank" rel="noopener noreferrer" style={{ color: "#3897f0", textDecoration: "none", fontSize: 14 }}>
                  Открыть в Instagram →
                </a>
              </div>
            </blockquote>

            {p.produkt_slug && (
              <Link
                href={`/katalog/${p.produkt_slug}`}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-vintage-gold text-vintage-espresso font-sans text-xs tracking-widest uppercase hover:bg-vintage-amber transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                К товару{p.produkt_name ? `: ${p.produkt_name}` : ""} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        ))}
      </div>

      <Script
        id="instagram-embed-js"
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => { try { window.instgrm?.Embeds?.process(); } catch { /* ignore */ } }}
      />
    </>
  );
}
