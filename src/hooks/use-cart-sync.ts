"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart";

/* ──────────────────────────────────────────────────────────────────────────
 * useCartSync — synchronisiert lokalen zustand-Cart mit /api/cart.
 *
 * Verhalten:
 *  1. On Mount: GET /api/cart. Wenn 401 (anonymous) → bleibt auf lokal.
 *     Wenn 200 mit Server-Items → MERGE mit lokalem Cart (mehr Items
 *     gewinnt, gleiche IDs addieren bis max_menge), dann PUT zurück.
 *  2. Bei jeder lokalen Cart-Änderung → debounced PUT (800ms) zum Server.
 *  3. Cross-Tab-Sync via storage-Event (wenn anderer Tab Cart updated,
 *     dieser Tab reload't den lokalen Store).
 *
 * Stille Failures: alle Netz-Fehler werden geswallowt. Sync ist Nice-to-
 * Have, nicht kritisch — lokaler Cart funktioniert eh stand-alone.
 *
 * Polling für Live-Sync (Web ↔ Mini-App-Echtzeit-Reflektion):
 *  - Default DEAKTIVIERT. Kostet API-Calls und ist meist unnötig (User
 *    macht Cart auf einem Device, checkt out, fertig).
 *  - Caller kann `{ pollMs: 8000 }` setzen wenn er Live-Sync braucht
 *    (z.B. wenn beide Apps gleichzeitig offen sind beim Demonstrieren).
 * ────────────────────────────────────────────────────────────────────────── */

interface Options {
  pollMs?:    number;   // Polling-Intervall für Cross-Device-Sync (0 = aus)
  debounceMs?: number;  // Debounce für PUTs (default 800)
}

export function useCartSync(options: Options = {}) {
  const { pollMs = 0, debounceMs = 800 } = options;

  const items       = useCart(s => s.items);
  const coupon_code = useCart(s => s.coupon_code);
  // setState ohne Re-Render-Loop — wir greifen direkt auf getState/setState
  // statt useCart() Subscription für die Replace-Operation
  const initialLoad = useRef(false);
  const skipNextPut = useRef(false);   // verhindert Echo PUT nach GET-Replace
  const lastSentHash = useRef<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial-Load + Merge ─────────────────────────────────────────────
  useEffect(() => {
    let aborted = false;
    fetch("/api/cart", { credentials: "include" })
      .then(r => {
        if (r.status === 401) return null;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (aborted) return;
        initialLoad.current = true;

        if (!data) {
          // 401 — anonymous user, kein Server-Cart
          return;
        }
        const serverItems  = Array.isArray(data.items) ? data.items : [];
        const serverCoupon = data.coupon_code ?? undefined;
        const local        = useCart.getState();

        // Wenn beide leer → nichts zu tun
        if (local.items.length === 0 && serverItems.length === 0) {
          return;
        }

        // Merge: gleiche produkt_id → Mengen addieren (mit max_menge cap)
        const mergedMap = new Map(serverItems.map((s: { produkt_id: string }) => [s.produkt_id, s]));
        for (const l of local.items) {
          const existing = mergedMap.get(l.produkt_id) as typeof l | undefined;
          if (existing) {
            const newMenge = existing.menge + l.menge;
            existing.menge = existing.max_menge
              ? Math.min(newMenge, existing.max_menge)
              : newMenge;
          } else {
            mergedMap.set(l.produkt_id, { ...l });
          }
        }
        const merged = Array.from(mergedMap.values()) as typeof local.items;

        // State setzen ohne dass useCart die PUT triggert
        skipNextPut.current = true;
        useCart.setState({
          items:           merged,
          coupon_code:     local.coupon_code ?? serverCoupon,
          aktualisiert_am: Date.now(),
        });

        // Wenn lokal mehr Items hatte als Server → push merged hoch
        if (merged.length !== serverItems.length || local.items.length > 0) {
          fetch("/api/cart", {
            method:      "PUT",
            headers:     { "Content-Type": "application/json" },
            body:        JSON.stringify({
              items:       merged,
              coupon_code: local.coupon_code ?? serverCoupon ?? null,
            }),
            credentials: "include",
          }).catch(() => {});
          lastSentHash.current = hashCart(merged, local.coupon_code ?? serverCoupon ?? null);
        } else {
          lastSentHash.current = hashCart(serverItems as typeof local.items, serverCoupon ?? null);
        }
      })
      .catch(() => {/* silent */});

    return () => { aborted = true; };
  }, []);

  // ─── Debounced PUT bei lokalen Änderungen ─────────────────────────────
  useEffect(() => {
    if (!initialLoad.current) return;          // Vor dem ersten GET nicht pushen
    if (skipNextPut.current) {
      skipNextPut.current = false;
      return;
    }
    const hash = hashCart(items, coupon_code ?? null);
    if (hash === lastSentHash.current) return; // Nichts geändert

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetch("/api/cart", {
        method:      "PUT",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          items,
          coupon_code: coupon_code ?? null,
        }),
        credentials: "include",
      })
        .then(r => {
          if (r.ok) lastSentHash.current = hash;
          // 401 = User loggte aus → wir hören auf zu syncen
        })
        .catch(() => {/* silent */});
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [items, coupon_code, debounceMs]);

  // ─── Optional Polling für Cross-Device-Sync ───────────────────────────
  useEffect(() => {
    if (!pollMs || pollMs < 2000) return;
    const interval = setInterval(() => {
      fetch("/api/cart", { credentials: "include" })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!data) return;
          const serverHash = hashCart(data.items ?? [], data.coupon_code ?? null);
          // Wenn Server-Hash anders als unser zuletzt gesendeter → Update
          if (serverHash !== lastSentHash.current && serverHash !== hashCart(items, coupon_code ?? null)) {
            skipNextPut.current = true;
            useCart.setState({
              items:           data.items ?? [],
              coupon_code:     data.coupon_code ?? undefined,
              aktualisiert_am: Date.now(),
            });
            lastSentHash.current = serverHash;
          }
        })
        .catch(() => {});
    }, pollMs);
    return () => clearInterval(interval);
  }, [pollMs, items, coupon_code]);
}

/** Stable hash für „hat sich Cart wirklich geändert" — vermeidet PUT-Spam
 *  bei zustand-State-Updates die im Inhalt identisch sind. */
function hashCart(items: { produkt_id: string; menge: number }[], coupon: string | null): string {
  return items
    .map(i => `${i.produkt_id}:${i.menge}`)
    .sort()
    .join("|") + `#${coupon ?? ""}`;
}
