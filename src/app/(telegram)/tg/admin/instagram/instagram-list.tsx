"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { InstagramRow } from "./instagram-row";
import { instagramPostsReorderAction } from "../actions";
import { haptic } from "../../fx";

type Option = { value: string; label: string };
interface Post {
  id:           string;
  permalink:    string;
  shortcode:    string;
  typ:          string;
  aktiv:        boolean;
  kategorie_id: number | null;
  produkt_id:   string | null;
  titel:        string | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * InstagramList — Drag-sortierbare Liste der Archiv-Posts.
 *
 * Touch-DnD via Pointer-Events am Griff (GripVertical). Während des Ziehens
 * wird die Reihenfolge lokal umsortiert; beim Loslassen via Server-Action
 * (instagramPostsReorderAction) persistiert. Die Zeilen selbst (InstagramRow)
 * behalten ihre eigenen Selects/Buttons — Drag startet NUR am Griff.
 * ────────────────────────────────────────────────────────────────────────── */
export function InstagramList({
  posts, kategorien, produkte,
}: { posts: Post[]; kategorien: Option[]; produkte: Option[] }) {
  const router = useRouter();
  const [order, setOrder] = useState<Post[]>(posts);
  const [, start] = useTransition();
  const draggingId = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Resync, wenn der Server neue Daten liefert (z.B. nach Row-Edit-Refresh).
  const sig = posts.map(p => `${p.id}:${p.aktiv}:${p.kategorie_id}:${p.produkt_id}`).join("|");
  useEffect(() => { setOrder(posts); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sig]);

  const move = (e: PointerEvent) => {
    const id = draggingId.current;
    if (!id) return;
    const y = e.clientY;
    setOrder(prev => {
      const from = prev.findIndex(p => p.id === id);
      if (from < 0) return prev;
      let target = prev.length - 1;
      for (let i = 0; i < prev.length; i++) {
        const el = rowRefs.current.get(prev[i].id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y < r.top + r.height / 2) { target = i; break; }
      }
      if (target === from) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const up = () => {
    window.removeEventListener("pointermove", move);
    const id = draggingId.current;
    draggingId.current = null;
    setDragId(null);
    if (!id) return;
    setOrder(curr => {
      start(async () => {
        const r = await instagramPostsReorderAction(curr.map(p => p.id));
        if (r.ok) { haptic("success"); router.refresh(); }
        else haptic("error");
      });
      return curr;
    });
  };

  const down = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    draggingId.current = id;
    setDragId(id);
    haptic("light");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  // Aufräumen, falls mitten im Drag unmountet wird.
  useEffect(() => () => { window.removeEventListener("pointermove", move); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-2">
      {order.map(p => (
        <div
          key={p.id}
          ref={el => { if (el) rowRefs.current.set(p.id, el); else rowRefs.current.delete(p.id); }}
          className="flex items-stretch gap-2"
          style={{
            opacity:    dragId === p.id ? 0.55 : 1,
            transition: dragId ? "none" : "opacity 120ms",
            touchAction: dragId ? "none" : undefined,
          }}
        >
          <button
            type="button"
            onPointerDown={down(p.id)}
            className="shrink-0 flex items-center justify-center px-1"
            aria-label="Перетащить"
            style={{
              touchAction: "none",
              cursor:      "grab",
              color:       "var(--tg-theme-hint-color, var(--color-ink-mute))",
              background:  "var(--tg-theme-section-bg-color, #fff)",
              border:      "1px solid var(--color-line)",
            }}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <InstagramRow
              id={p.id}
              permalink={p.permalink}
              shortcode={p.shortcode}
              typ={p.typ}
              aktiv={p.aktiv}
              kategorieId={p.kategorie_id}
              produktId={p.produkt_id}
              titel={p.titel}
              kategorien={kategorien}
              produkte={produkte}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
