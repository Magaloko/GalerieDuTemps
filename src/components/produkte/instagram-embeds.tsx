"use client";

import { useEffect } from "react";
import Script from "next/script";
import { InstagramIcon } from "./instagram-icon";

interface Props {
  /** Liste kanonischer IG-Permalink-URLs */
  urls: string[];
  /** Optionaler Section-Titel */
  titel?: string;
}

declare global {
  // Instagram's embed.js setzt window.instgrm.Embeds.process()
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * InstagramEmbeds
 *
 * Rendert eine Liste von IG-Reels/Posts via offiziellem Instagram-Embed-Script.
 *
 * So funktioniert's:
 *  1. Pro URL: <blockquote class="instagram-media" data-instgrm-permalink="...">
 *  2. <Script src="https://www.instagram.com/embed.js"> wird einmalig geladen
 *  3. window.instgrm.Embeds.process() wandelt die blockquotes in iframes um
 *     — wir rufen es manuell bei Mount + bei urls-Änderung, falls Script
 *     schon geladen war.
 *
 * Sicherheit: kein dangerouslySetInnerHTML mit User-Input. Wir kontrollieren
 * komplett das blockquote-Markup; nur die URL kommt aus der DB (durch
 * extractInstagramUrl() schon kanonisiert + validiert).
 *
 * Performance: das embed.js läuft mit strategy="lazyOnload" — erst nach allen
 * Page-Resources. Verlangsamt den initialen Pageload nicht.
 * ────────────────────────────────────────────────────────────────────────── */

export function InstagramEmbeds({ urls, titel = "В Instagram" }: Props) {
  // Wenn das embed.js schon geladen ist (z.B. SPA-Navigation zur nächsten
  // Produktseite), müssen wir Process() manuell triggern, damit neue
  // blockquotes erkannt werden.
  useEffect(() => {
    if (urls.length === 0) return;
    const triggerProcess = () => {
      try {
        window.instgrm?.Embeds?.process();
      } catch {
        /* embed.js noch nicht geladen — Script-onLoad triggert es dann */
      }
    };
    // Kurze Verzögerung damit DOM stabil ist
    const t = window.setTimeout(triggerProcess, 100);
    return () => window.clearTimeout(t);
  }, [urls]);

  if (urls.length === 0) return null;

  return (
    <section className="my-12">
      <div className="flex items-center gap-2 mb-6">
        <InstagramIcon className="w-4 h-4" style={{ color: "#C13584" }} />
        <h3
          className="text-[11px] uppercase font-medium"
          style={{
            letterSpacing: "0.28em",
            color:         "var(--color-coral)",
          }}
        >
          {titel}
        </h3>
      </div>

      <div className="flex flex-wrap gap-6 justify-center md:justify-start">
        {urls.map((url) => (
          <blockquote
            key={url}
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{
              background:   "#FFF",
              border:       "0",
              borderRadius: "3px",
              boxShadow:    "0 0 1px 0 rgba(0,0,0,0.5), 0 1px 10px 0 rgba(0,0,0,0.15)",
              margin:       "1px",
              maxWidth:     "540px",
              minWidth:     "326px",
              padding:      "0",
              width:        "99.375%",
            }}
          >
            {/* Loading-Fallback bis embed.js die iframe einsetzt */}
            <div style={{ padding: "16px" }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3897f0", textDecoration: "none", fontSize: 14 }}
              >
                Открыть пост в Instagram →
              </a>
            </div>
          </blockquote>
        ))}
      </div>

      {/* Embed-Script lazy-laden. Nach onLoad wird process() einmalig getriggert. */}
      <Script
        id="instagram-embed-js"
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => {
          try {
            window.instgrm?.Embeds?.process();
          } catch { /* ignore */ }
        }}
      />
    </section>
  );
}
