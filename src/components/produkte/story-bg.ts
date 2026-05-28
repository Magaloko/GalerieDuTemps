/* ──────────────────────────────────────────────────────────────────────────
 * Story-Block-Hintergründe — markenkonforme, feste Palette (kein freies Hex).
 * Geteilt zwischen Editor (Client) und Renderer (Server) — reine Daten.
 * Key wird in ProduktBlock.bg gespeichert; "standard" = kein Hintergrund.
 * ────────────────────────────────────────────────────────────────────────── */
export const STORY_BG: Record<string, { label: string; css: string; swatch: string }> = {
  standard: { label: "Стандарт", css: "transparent",                 swatch: "transparent" },
  warm:     { label: "Тёплый",   css: "var(--color-paper-warm,#E8DFD0)", swatch: "#E8DFD0" },
  bone:     { label: "Кость",    css: "var(--color-bone,#EFE9DC)",    swatch: "#EFE9DC" },
  sage:     { label: "Шалфей",   css: "rgba(127,140,90,0.12)",        swatch: "#CBD3BC" },
  cobalt:   { label: "Кобальт",  css: "rgba(15,20,48,0.06)",          swatch: "#C7CBDA" },
  coral:    { label: "Коралл",   css: "rgba(232,112,58,0.08)",        swatch: "#F3C8B4" },
  weiss:    { label: "Белый",    css: "#ffffff",                      swatch: "#ffffff" },
};

export const STORY_BG_KEYS = Object.keys(STORY_BG);

/** CSS-Hintergrund für einen Block (oder null wenn ohne/Standard). */
export function storyBgCss(bg?: string): string | null {
  if (!bg || bg === "standard") return null;
  return STORY_BG[bg]?.css ?? null;
}
