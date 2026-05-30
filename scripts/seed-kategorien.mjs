#!/usr/bin/env node
/**
 * galeriedutemps · Kategorien-Seed/Sync
 *
 * Bringt sebo.kategorien auf den gewünschten Sollzustand (7 Kategorien in
 * fester Reihenfolge, deutsche Slugs wie bestehende Konvention). Idempotent:
 *  - legt fehlende Kategorien an,
 *  - aktualisiert Name/Beschreibung/Sortierung bestehender (per slug),
 *  - deaktiviert nicht-gelistete (aktiv=false, Produkte/Daten bleiben).
 *
 * Läuft gegen DATABASE_URL aus .env.local (= echte Galerie-DB).
 *
 * Usage:
 *   node scripts/seed-kategorien.mjs --dry-run   # nur zeigen, nicht schreiben
 *   node scripts/seed-kategorien.mjs             # anwenden (in Transaction)
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");

const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const url = env.match(/^DATABASE_URL\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("✗ DATABASE_URL nicht in .env.local gefunden"); process.exit(1); }

// Soll-Kategorien in gewünschter Reihenfolge (slug = deutsch, wie Bestand)
const KATEGORIEN = [
  { name: "Столовые приборы", slug: "besteck", sortierung: 1,
    beschreibung: "Винтажные и антикварные столовые приборы — вилки, ложки и ножи из серебра, мельхиора и стали. Предметы с историей для изысканной сервировки стола." },
  { name: "Декор", slug: "deko", sortierung: 2,
    beschreibung: "Декоративные предметы для дома — вазы, подсвечники, статуэтки и интерьерные акценты, хранящие тепло ушедших эпох." },
  { name: "Ювелирные изделия", slug: "edelschmuck", sortierung: 3,
    beschreibung: "Ювелирные изделия из драгоценных металлов — кольца, броши, серьги и подвески ручной работы с подлинной историей." },
  { name: "Украшения", slug: "schmuck", sortierung: 4,
    beschreibung: "Украшения и бижутерия — броши, бусы, браслеты и аксессуары разных эпох. Завершающий штрих для особого образа." },
  { name: "Часы", slug: "uhren", sortierung: 5,
    beschreibung: "Антикварные и винтажные часы — настольные, настенные, каминные и карманные. Механизмы, отмеряющие время с благородной точностью." },
  { name: "Посуда", slug: "geschirr", sortierung: 6,
    beschreibung: "Винтажная посуда — фарфор, фаянс и стекло. Тарелки, чашки, сервизы и предметы для стола с патиной времени." },
  { name: "Посеребренные сервировочные аксессуары", slug: "versilbert", sortierung: 7,
    beschreibung: "Посеребрённые сервировочные аксессуары — подносы, соусники, сахарницы и подставки. Благородный блеск серебра для торжественного стола." },
];

// Bestehende Kategorien, die NICHT auf der Soll-Liste stehen → deaktivieren
const DEAKTIVIEREN_SLUGS = ["porzellan", "textilien", "kunst", "kueche"];

const c = new pg.Client({ connectionString: url });
await c.connect();
try {
  if (!DRY) await c.query("BEGIN");
  for (const k of KATEGORIEN) {
    const ex = await c.query("SELECT id FROM sebo.kategorien WHERE slug = $1", [k.slug]);
    if (ex.rowCount > 0) {
      console.log(`UPDATE   /${k.slug.padEnd(12)} «${k.name}»`);
      if (!DRY) await c.query(
        "UPDATE sebo.kategorien SET name=$1, beschreibung=$2, sortierung=$3, aktiv=true WHERE slug=$4",
        [k.name, k.beschreibung, k.sortierung, k.slug]);
    } else {
      console.log(`INSERT   /${k.slug.padEnd(12)} «${k.name}»`);
      if (!DRY) await c.query(
        "INSERT INTO sebo.kategorien (name, slug, beschreibung, sortierung, aktiv) VALUES ($1,$2,$3,$4,true)",
        [k.name, k.slug, k.beschreibung, k.sortierung]);
    }
  }
  if (!DRY) {
    const d = await c.query(
      "UPDATE sebo.kategorien SET aktiv=false WHERE slug = ANY($1) RETURNING slug", [DEAKTIVIEREN_SLUGS]);
    console.log(`DEAKTIV. ${d.rows.map(r => "/" + r.slug).join(", ") || "(keine)"}`);
  } else {
    console.log(`DEAKTIV. (dry) ${DEAKTIVIEREN_SLUGS.map(s => "/" + s).join(", ")}`);
  }
  if (!DRY) await c.query("COMMIT");

  const all = await c.query(
    "SELECT name, slug, aktiv, sortierung FROM sebo.kategorien ORDER BY aktiv DESC, sortierung, name");
  console.log(`\n=== STAND ${DRY ? "(DRY-RUN — nichts geschrieben)" : "(geschrieben)"} ===`);
  for (const r of all.rows) {
    console.log(`${r.aktiv ? "●" : "○"} sort=${String(r.sortierung).padStart(2)}  /${r.slug.padEnd(13)} ${r.name}`);
  }
} catch (e) {
  if (!DRY) await c.query("ROLLBACK").catch(() => {});
  console.error("✗ FEHLER:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
