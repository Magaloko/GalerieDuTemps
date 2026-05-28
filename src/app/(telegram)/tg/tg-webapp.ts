/* ──────────────────────────────────────────────────────────────────────────
 * Telegram-WebApp Helpers — version-safe Zugriff
 *
 * Telegram-Clients sind unterschiedlich alt. Methoden wie MainButton.offClick
 * (ab Bot-API 6.1) oder HapticFeedback existieren auf älteren Clients NICHT —
 * ein direkter Aufruf wirft dort und kann die ganze Mini-App lahmlegen.
 *
 * Statt ein schweres SDK einzuziehen, kapseln wir die kritischen Calls hier mit
 * Feature-/Version-Detection. Reine Helper, keine Dependency.
 * ────────────────────────────────────────────────────────────────────────── */

type TgWebApp = NonNullable<NonNullable<Window["Telegram"]>["WebApp"]>;
type TgMainButton = TgWebApp["MainButton"];

/** WebApp-Objekt holen (SSR-safe). */
export function getWebApp(): TgWebApp | undefined {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
}

/**
 * Prüft ob der Telegram-Client mindestens Version `min` (z.B. "6.1") hat.
 * Nutzt das native isVersionAtLeast, fällt auf String-Vergleich von `version`
 * zurück. Bei fehlendem WebApp → false (konservativ).
 */
export function tgVersionAtLeast(min: string): boolean {
  const tg = getWebApp();
  if (!tg) return false;
  try {
    if (typeof tg.isVersionAtLeast === "function") return tg.isVersionAtLeast(min);
  } catch {/* fallthrough auf String-Vergleich */}
  const cur  = String(tg.version ?? "6.0").split(".").map(n => parseInt(n, 10) || 0);
  const need = min.split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < need.length; i++) {
    const c = cur[i] ?? 0;
    if (c > need[i]) return true;
    if (c < need[i]) return false;
  }
  return true;
}

/**
 * MainButton.offClick version-/feature-safe entfernen. Auf Clients ohne
 * offClick (vor 6.1) wird einfach nichts getan — kein Crash.
 */
export function mainButtonOffClick(main: TgMainButton, cb: () => void): void {
  try {
    if (typeof main.offClick === "function") main.offClick(cb);
  } catch {/* ignore */}
}
