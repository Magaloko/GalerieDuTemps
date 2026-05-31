import { query } from "./index";

/* ──────────────────────────────────────────────────────────────────────────
 * Theme-Settings — Custom Brand-Theme aus DB.
 *
 * Wird vom Root-Layout bei jedem Render geladen (mit 60s Cache) und als
 * inline `<style>:root { --color-coral: ...; }</style>` in den <head>
 * injiziert. Diese CSS-Variablen überschreiben die Defaults aus globals.css.
 *
 * Editierbar in /admin/einstellungen/design.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ThemeSetting {
  schluessel:      string;
  wert:            string;
  typ:             "color" | "url" | "text" | "toggle";
  gruppe:          "colors" | "branding" | "typography";
  beschreibung:    string | null;
  aktualisiert_am: string;
}

const CACHE_TTL_MS = 60_000;
let cache: { value: Map<string, ThemeSetting>; expires: number } | null = null;

function invalidateThemeCache() {
  cache = null;
}

async function loadAllTheme(): Promise<Map<string, ThemeSetting>> {
  if (cache && cache.expires > Date.now()) return cache.value;
  try {
    const r = await query<ThemeSetting>(
      `SELECT schluessel, wert, typ, gruppe, beschreibung, aktualisiert_am
       FROM sebo.theme_settings`
    );
    const map = new Map(r.rows.map(row => [row.schluessel, row]));
    cache = { value: map, expires: Date.now() + CACHE_TTL_MS };
    return map;
  } catch (err) {
    console.warn("[theme] DB-Load fehlgeschlagen, nutze Code-Defaults:", err);
    return new Map();
  }
}

/** Alle Theme-Settings, gruppiert nach 'gruppe'. */
export async function getAllThemeSettings(): Promise<ThemeSetting[]> {
  const map = await loadAllTheme();
  return Array.from(map.values()).sort((a, b) => {
    if (a.gruppe !== b.gruppe) return a.gruppe.localeCompare(b.gruppe);
    return a.schluessel.localeCompare(b.schluessel);
  });
}

/** Liefert nur die color.* Tokens als { 'cobalt': '#…', 'coral': '#…' }. */
export async function getThemeColors(): Promise<Record<string, string>> {
  const map = await loadAllTheme();
  const out: Record<string, string> = {};
  for (const [key, row] of map) {
    if (row.typ === "color" && key.startsWith("color.")) {
      const tokenName = key.slice("color.".length);  // 'cobalt', 'coral-deep', …
      out[tokenName] = row.wert;
    }
  }
  return out;
}

/** Branding-Tokens (logo_url, favicon_url, brand.name, tagline, …). */
export async function getThemeBranding(): Promise<{
  logoUrl:      string | null;
  faviconUrl:   string | null;
  showWordmark: boolean;
  brandName:    string;
  tagline:      string;
}> {
  const map = await loadAllTheme();
  const v = (k: string) => map.get(k)?.wert ?? "";
  return {
    logoUrl:      v("brand.logo_url")    || null,
    faviconUrl:   v("brand.favicon_url") || null,
    showWordmark: v("brand.show_wordmark") !== "false",
    brandName:    v("brand.name")        || "Galerie du Temps",
    tagline:      v("brand.tagline")     || "Винтаж с историей. Изящество вне времени.",
  };
}

/** Single Setting updaten. Admin-only — Caller muss Auth prüfen. */
export async function setThemeSetting(schluessel: string, wert: string): Promise<void> {
  await query(
    `UPDATE sebo.theme_settings SET wert = $1 WHERE schluessel = $2`,
    [wert, schluessel],
  );
  invalidateThemeCache();
}

/** Bulk-Update: { 'color.coral': '#E8703A', … } */
export async function setManyThemeSettings(patch: Record<string, string>): Promise<void> {
  const entries = Object.entries(patch);
  if (entries.length === 0) return;
  // Eine Query mit VALUES-Tupel
  const values = entries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
  const params: string[] = entries.flatMap(([k, v]) => [k, v]);
  await query(
    `UPDATE sebo.theme_settings AS t
     SET wert = c.wert
     FROM (VALUES ${values}) AS c(schluessel, wert)
     WHERE t.schluessel = c.schluessel`,
    params,
  );
  invalidateThemeCache();
}

// Erlaubte Formate für CSS-Custom-Property-Token-Namen:
// Muss mit Kleinbuchstabe beginnen, darf Kleinbuchstaben, Ziffern und Bindestriche enthalten.
const SAFE_TOKEN_RE  = /^[a-z][a-z0-9-]*$/;
// Erlaubte Farb-Werte: HEX (3–8 Hex-Ziffern) oder reines CSS-Keyword (nur a-z).
// Schließt Semikolons, Klammern, Whitespace und andere Injection-Vektoren aus.
const SAFE_VALUE_RE  = /^(?:#[0-9a-fA-F]{3,8}|[a-z]+)$/;

/** CSS-Snippet für <head>-Injection mit allen Color-Tokens.
 *
 * Sicherheits-Filter: Token-Name UND Wert werden per Regex validiert,
 * ungültige Einträge werden silently übersprungen (kein Throw).
 * Verhindert CSS-Custom-Property-Injection bei direktem DB-Write
 * (z.B. über direkten DB-Zugang ohne die saveThemeAction-Validierung).
 */
export async function renderThemeCssVars(): Promise<string> {
  const colors = await getThemeColors();
  if (Object.keys(colors).length === 0) return "";
  const lines: string[] = [];
  for (const [token, value] of Object.entries(colors)) {
    // Ungültige Token oder Werte still überspringen — niemals unvalidiert ausgeben.
    if (!SAFE_TOKEN_RE.test(token) || !SAFE_VALUE_RE.test(value)) continue;
    lines.push(`  --color-${token}: ${value};`);
  }
  if (lines.length === 0) return "";
  return `:root {\n${lines.join("\n")}\n}`;
}
