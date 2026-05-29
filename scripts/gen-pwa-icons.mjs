// ---------------------------------------------------------------------------
// scripts/gen-pwa-icons.mjs
// ---------------------------------------------------------------------------
// Generiert die PWA-/App-Icons aus public/images/galerie-logo.png (1026×1024,
// Cobalt-BG + Coral-Emblem). Output → public/icons/ + public/apple-touch-icon.png.
//
//   npm run gen:icons   (siehe package.json)
//
// Quadratische „any"-Icons nutzen das Logo direkt (hat schon Cobalt-Rand).
// Das maskable-Icon legt das Logo mit Safe-Zone (~78 %) auf eine volle
// Cobalt-Fläche, damit Android-Masken nichts Wichtiges abschneiden.
// ---------------------------------------------------------------------------
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/images/galerie-logo.png");
const ICONS_DIR = join(ROOT, "public/icons");
const COBALT = "#1B2566";

await mkdir(ICONS_DIR, { recursive: true });

// „any"-Icons: Logo direkt skaliert (cover, quadratisch).
for (const size of [192, 512]) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover" })
    .png()
    .toFile(join(ICONS_DIR, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// apple-touch-icon: 180×180, behebt zugleich die fehlende /apple-touch-icon.png.
await sharp(SRC)
  .resize(180, 180, { fit: "cover" })
  .png()
  .toFile(join(ROOT, "public/apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");

// Maskable: Logo @ 78 % zentriert auf voller Cobalt-Fläche (Safe-Zone).
const MASK = 512;
const inner = Math.round(MASK * 0.78);
const logo = await sharp(SRC).resize(inner, inner, { fit: "contain", background: COBALT }).png().toBuffer();
await sharp({ create: { width: MASK, height: MASK, channels: 4, background: COBALT } })
  .composite([{ input: logo, gravity: "centre" }])
  .png()
  .toFile(join(ICONS_DIR, "maskable-512.png"));
console.log("✓ maskable-512.png");

console.log("PWA-Icons fertig.");
