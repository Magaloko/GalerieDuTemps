import { ImageResponse } from "next/og";

/* ──────────────────────────────────────────────────────────────────────────
 * Dynamic Open Graph Image — Next.js File Convention.
 *
 * Liefert https://galerie.apps.dadakaev.tech/opengraph-image als 1200×630
 * Cobalt-Bg mit Coral-Wordmark + Tagline. Ersetzt den 404 von /og-default.jpg.
 *
 * Edge-Runtime + nur System-Fonts → kein Font-Loading, schneller First-Paint.
 * Twitter-Card wird über twitter-image.tsx separat gespiegelt.
 * ────────────────────────────────────────────────────────────────────────── */

export const runtime     = "edge";
export const alt         = "Galerie du Temps — Винтажные сокровища с историей";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          "100%",
          height:         "100%",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          background:     "#1B2566",
          color:          "#E8703A",
          padding:        "80px",
          fontFamily:     "Georgia, serif",
          position:       "relative",
        }}
      >
        {/* Hourglass SVG inline */}
        <svg
          width="120"
          height="240"
          viewBox="0 0 100 200"
          fill="none"
          stroke="#E8703A"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 40 }}
        >
          <rect x="6"  y="6"  width="88" height="188" rx="2" />
          <rect x="11" y="11" width="78" height="178" rx="1" />
          <path d="M14 22 H86 V36 Q86 52 78 60 L60 78 Q50 86 50 96 Q50 86 40 78 L22 60 Q14 52 14 36 Z" />
          <path d="M50 96 Q50 106 40 114 L22 132 Q14 140 14 156 V172 H86 V156 Q86 140 78 132 L60 114 Q50 106 50 96 Z" />
          <path d="M14 172 H86 V186 H14 Z" />
          <path d="M22 168 Q34 156 50 156 Q66 156 78 168 Z" fill="#E8703A" stroke="none" opacity="0.95" />
        </svg>

        {/* GALERIE — gespreizt */}
        <div
          style={{
            fontSize:      120,
            letterSpacing: "0.22em",
            paddingLeft:   "0.22em",
            color:         "#E8703A",
            lineHeight:    1,
            fontWeight:    400,
            display:       "flex",
          }}
        >
          GALERIE
        </div>

        {/* du Temps — italic */}
        <div
          style={{
            fontSize:      48,
            fontStyle:     "italic",
            color:         "#E8703A",
            marginTop:     16,
            letterSpacing: "0.02em",
            display:       "flex",
          }}
        >
          du Temps
        </div>

        {/* Tagline */}
        <div
          style={{
            position:      "absolute",
            bottom:        56,
            fontSize:      20,
            color:         "rgba(255,255,255,0.7)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontFamily:    "system-ui, sans-serif",
            display:       "flex",
          }}
        >
          Rare pieces with history, elegance, and timeless charm.
        </div>
      </div>
    ),
    { ...size },
  );
}
