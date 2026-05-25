#!/usr/bin/env node
/**
 * vintage-market · Admin-User anlegen
 * ─────────────────────────────────────────────────────────────────────────────
 * Verwendung:
 *   node scripts/create-admin.mjs
 *
 * Liest DATABASE_URL aus .env.local (oder Umgebung).
 * Fragt interaktiv nach E-Mail, Name und Passwort.
 * Legt den Benutzer mit bcrypt-Hash in sebo.benutzer an.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// .env.local einlesen (einfaches Parsing ohne dotenv-Abhängigkeit)
// ---------------------------------------------------------------------------
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env.local");

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("✓ .env.local geladen\n");
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL nicht gesetzt. .env.local prüfen.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Dynamische Imports (nach env-Laden)
// ---------------------------------------------------------------------------
const { default: pkg }     = await import("pg");
const { Pool }             = pkg;
const { default: bcrypt }  = await import("bcryptjs");

// ---------------------------------------------------------------------------
// Readline-Helper
// ---------------------------------------------------------------------------
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
const askHidden = (question) => {
  process.stdout.write(question);
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    let input = "";
    process.stdin.on("data", function handler(char) {
      char = char.toString();
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.removeListener("data", handler);
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "") {
        process.exit();
      } else if (char === "") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        input += char;
        process.stdout.write("*");
      }
    });
  });
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log("═══════════════════════════════════════════════");
console.log("  Vintage Market · Admin-User erstellen");
console.log("═══════════════════════════════════════════════\n");

const email    = await ask("E-Mail:    ");
const name     = await ask("Name:      ");
const password = await askHidden("Passwort:  ");
const confirm  = await askHidden("Bestätigen:");

rl.close();

if (password !== confirm) {
  console.error("\n✗ Passwörter stimmen nicht überein.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("\n✗ Passwort muss mindestens 8 Zeichen haben.");
  process.exit(1);
}

console.log("\n→ Passwort wird gehasht …");
const hash = await bcrypt.hash(password, 12);

console.log("→ Verbindung zur Datenbank …");
const pool = new Pool({ connectionString: DATABASE_URL });

try {
  const result = await pool.query(
    `INSERT INTO sebo.benutzer (email, passwort_hash, name, rolle)
     VALUES ($1, $2, $3, 'superadmin')
     ON CONFLICT (email) DO UPDATE
       SET passwort_hash   = EXCLUDED.passwort_hash,
           name            = EXCLUDED.name,
           aktualisiert_am = now()
     RETURNING id, email, name, rolle`,
    [email.toLowerCase(), hash, name || email]
  );

  const user = result.rows[0];
  console.log("\n✓ Admin-User angelegt / aktualisiert:");
  console.log(`  ID:    ${user.id}`);
  console.log(`  E-Mail: ${user.email}`);
  console.log(`  Name:  ${user.name}`);
  console.log(`  Rolle: ${user.rolle}`);
  console.log("\n  Login unter: /login\n");
} catch (err) {
  console.error("\n✗ Datenbankfehler:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
