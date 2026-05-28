/* ──────────────────────────────────────────────────────────────────────────
 * Mini-App Visual / Haptic Effects
 *
 * Reine Client-Helpers — kein Import von React/lib/db. SSR-safe Guards
 * (typeof window !== "undefined").
 *
 * Telegram-HapticFeedback API ist undocumented vor v6.1, daher try/catch
 * jedes Aufrufes. Bei fehlendem Support einfach silent no-op.
 *
 * Confetti: pure CSS (kein Bibliotheks-Bundle) — DOM-Particles mit
 * keyframe-Animation, nach 1.5s self-cleanup.
 * ────────────────────────────────────────────────────────────────────────── */

type HapticKind = "success" | "warning" | "error" | "light" | "medium" | "heavy" | "soft" | "rigid";

interface TgHaptic {
  notificationOccurred?: (s: "error" | "success" | "warning") => void;
  impactOccurred?:       (s: "light" | "medium" | "heavy" | "soft" | "rigid") => void;
  selectionChanged?:     () => void;
}

function getHaptic(): TgHaptic | undefined {
  if (typeof window === "undefined") return undefined;
  return (window.Telegram?.WebApp as unknown as { HapticFeedback?: TgHaptic } | undefined)?.HapticFeedback;
}

/** Konvenienter Haptic-Wrapper. Map auf richtige API-Methode + silent failure. */
export function haptic(kind: HapticKind): void {
  const h = getHaptic();
  if (!h) return;
  try {
    if (kind === "success" || kind === "warning" || kind === "error") {
      h.notificationOccurred?.(kind);
    } else {
      h.impactOccurred?.(kind);
    }
  } catch {/* ignore */}
}

/* ──────────────────────────────────────────────────────────────────────────
 * Confetti-Burst
 *
 * Spawnt 40 farbige Particles am angegebenen DOM-Punkt (z.B. Add-to-Cart
 * Button). Particles haben random velocity + rotation, fallen mit Gravity
 * nach unten, fade-out + Self-Cleanup nach 1.5s.
 *
 * Brand-Farben: coral (#E8703A), gold (#C9A84C), forest (#52663F),
 * ink (#0C0A08) — vintage-passend, kein Regenbogen-Disco.
 * ────────────────────────────────────────────────────────────────────────── */

const CONFETTI_COLORS = ["#E8703A", "#C9A84C", "#52663F", "#7F8C5A", "#0C0A08"];

export function confettiBurst(originX: number, originY: number, count = 40): void {
  if (typeof window === "undefined") return;
  ensureKeyframes();

  const container = document.createElement("div");
  container.style.cssText = [
    "position:fixed",
    `left:${originX}px`,
    `top:${originY}px`,
    "pointer-events:none",
    "z-index:9999",
    "width:0",
    "height:0",
  ].join(";");
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    const angle    = (Math.random() * Math.PI * 2);
    const velocity = 80 + Math.random() * 140;
    const tx       = Math.cos(angle) * velocity;
    const ty       = Math.sin(angle) * velocity - 80;   // upward boost
    const rotEnd   = Math.random() * 720 - 360;
    const color    = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const size     = 5 + Math.random() * 4;
    const duration = 900 + Math.random() * 600;

    p.style.cssText = [
      "position:absolute",
      "left:-3px",
      "top:-3px",
      `width:${size}px`,
      `height:${size * 0.5}px`,
      `background:${color}`,
      `transform:rotate(${Math.random() * 360}deg)`,
      `animation:tg-confetti ${duration}ms cubic-bezier(0.2,0.6,0.4,1) forwards`,
      `--tx:${tx}px`,
      `--ty:${ty}px`,
      `--rot:${rotEnd}deg`,
    ].join(";");
    container.appendChild(p);
  }

  setTimeout(() => { container.remove(); }, 1700);
}

/** Confetti vom Button selbst — convenience für onClick handlers. */
export function confettiFromElement(el: HTMLElement, count = 40): void {
  const rect = el.getBoundingClientRect();
  confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
}

function ensureKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("tg-fx-keyframes")) return;
  const style = document.createElement("style");
  style.id = "tg-fx-keyframes";
  style.textContent = `
    @keyframes tg-confetti {
      0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
      80%  { opacity: 1; }
      100% {
        transform: translate(var(--tx), calc(var(--ty) + 400px)) rotate(var(--rot));
        opacity: 0;
      }
    }
    @keyframes tg-pulse-coral {
      0%, 100% { box-shadow: 0 0 0 0 rgba(232,112,58,0.6); }
      50%      { box-shadow: 0 0 0 8px rgba(232,112,58,0); }
    }
    @keyframes tg-fade-in-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// Auto-inject keyframes on module load (cheap, idempotent)
if (typeof document !== "undefined") {
  ensureKeyframes();
}
