"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

interface Props {
  produktId: string;
  size?:     number;
  /** Absolute Position auf einem Bild (corner overlay).
   *  Wenn false: inline-Button mit Background. */
  overlay?:  boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * HeartToggle — kleine Like-Button für Mini-App.
 *
 * Optimistic-Update: Klick → State sofort flippen → API call → bei
 * Fail zurück. So fühlt sich das Liken instant an im langsamen WebView.
 *
 * Cookie-basiert (gleiche /api/wunschliste wie Web), aber Cookie-Jar
 * der Telegram-WebView ist separat vom Browser — also de-facto eigene
 * Wishlist pro Surface. Das ist OK in Mini-App-Kontext.
 *
 * Mit HapticFeedback (success-Notification) wenn Telegram-WebView das
 * unterstützt — gibt taktiles Feedback auf iPhone, fühlt sich nativ an.
 * ────────────────────────────────────────────────────────────────────────── */
export function HeartToggle({ produktId, size = 18, overlay = false }: Props) {
  const [liked,   setLiked]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);

  // Initial: einmal die Wishlist-IDs laden (cached über useEffect-Lifecycle).
  // Bei multiple HeartToggle auf einer Page fetched jedes Karten-Render
  // einmal — könnte man via Context optimieren, aber für 12-Item-Grid OK.
  useEffect(() => {
    let aborted = false;
    fetch("/api/wunschliste", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (aborted) return;
        if (Array.isArray(d.ids)) setLiked(d.ids.includes(produktId));
      })
      .catch(() => {})
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [produktId]);

  const toggle = async (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const next = !liked;
    setLiked(next);
    setBusy(true);

    // Haptic-Feedback
    const tg = window.Telegram?.WebApp as unknown as {
      HapticFeedback?: { impactOccurred: (s: string) => void };
    } | undefined;
    try { tg?.HapticFeedback?.impactOccurred(next ? "light" : "soft"); } catch {}

    try {
      const r = await fetch("/api/wunschliste", {
        method:      next ? "POST" : "DELETE",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ produkt_id: produktId }),
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch {
      // Rollback bei Fehler
      setLiked(!next);
    } finally {
      setBusy(false);
    }
  };

  if (overlay) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading || busy}
        aria-label={liked ? "Убрать из избранного" : "В избранное"}
        className="absolute top-2 right-2 p-1.5 transition-opacity"
        style={{
          background:   "rgba(255,255,255,0.92)",
          borderRadius: "999px",
          color:        liked ? "var(--color-coral)" : "var(--color-ink-mute)",
          opacity:      loading ? 0 : 1,
          touchAction:  "manipulation",
          minWidth:     32,
          minHeight:    32,
        }}
      >
        <Heart
          className="w-4 h-4"
          fill={liked ? "currentColor" : "none"}
          strokeWidth={liked ? 0 : 2}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || busy}
      aria-label={liked ? "Убрать из избранного" : "В избранное"}
      className="flex items-center justify-center transition-colors"
      style={{
        width:        44,
        height:       44,
        background:   liked ? "rgba(232,112,58,0.10)" : "var(--color-bone)",
        border:       `1px solid ${liked ? "var(--color-coral)" : "var(--color-line)"}`,
        color:        liked ? "var(--color-coral)" : "var(--color-ink-mute)",
        touchAction:  "manipulation",
      }}
    >
      <Heart
        style={{ width: size, height: size }}
        fill={liked ? "currentColor" : "none"}
        strokeWidth={liked ? 0 : 2}
      />
    </button>
  );
}
