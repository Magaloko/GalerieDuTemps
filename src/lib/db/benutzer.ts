import { query } from "./index";
import bcrypt from "bcryptjs";

// ===========================================================================
// Admin-User-Verwaltung (sebo.benutzer)
// ===========================================================================

export type BenutzerRolle = "admin" | "superadmin";

export interface Benutzer {
  id:              string;
  email:           string;
  name:            string | null;
  rolle:           BenutzerRolle;
  aktiv:           boolean;
  letzter_login?:  string | null;
  erstellt_am:     string;
  aktualisiert_am: string;
}

export async function benutzerListe(): Promise<Benutzer[]> {
  const r = await query<Benutzer>(
    `SELECT id, email, name, rolle, aktiv, erstellt_am, aktualisiert_am
     FROM sebo.benutzer
     ORDER BY aktiv DESC, name, email`
  );
  return r.rows;
}

export async function benutzerById(id: string): Promise<Benutzer | null> {
  const r = await query<Benutzer>(
    `SELECT id, email, name, rolle, aktiv, erstellt_am, aktualisiert_am
     FROM sebo.benutzer WHERE id = $1`,
    [id]
  );
  return r.rows[0] ?? null;
}

export async function benutzerByEmail(email: string): Promise<Benutzer | null> {
  const r = await query<Benutzer>(
    `SELECT id, email, name, rolle, aktiv, erstellt_am, aktualisiert_am
     FROM sebo.benutzer WHERE email = $1 LIMIT 1`,
    [email.toLowerCase()]
  );
  return r.rows[0] ?? null;
}

export interface BenutzerCreateInput {
  email:    string;
  name:     string;
  passwort: string;
  rolle?:   BenutzerRolle;
  aktiv?:   boolean;
}

export async function benutzerErstellen(input: BenutzerCreateInput): Promise<Benutzer> {
  const hash = await bcrypt.hash(input.passwort, 12);
  const r = await query<Benutzer>(
    `INSERT INTO sebo.benutzer (email, name, passwort_hash, rolle, aktiv)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, rolle, aktiv, erstellt_am, aktualisiert_am`,
    [input.email.toLowerCase().trim(), input.name.trim(), hash, input.rolle ?? "admin", input.aktiv ?? true]
  );
  return r.rows[0];
}

export interface BenutzerUpdateInput {
  name?:    string;
  rolle?:   BenutzerRolle;
  aktiv?:   boolean;
  passwort?: string;
}

export async function benutzerAktualisieren(id: string, input: BenutzerUpdateInput): Promise<void> {
  const felder: string[] = ["aktualisiert_am = now()"];
  const vals:   unknown[] = [];
  let idx = 1;
  if (input.name      !== undefined) { felder.push(`name = $${idx++}`);          vals.push(input.name); }
  if (input.rolle     !== undefined) { felder.push(`rolle = $${idx++}`);         vals.push(input.rolle); }
  if (input.aktiv     !== undefined) { felder.push(`aktiv = $${idx++}`);         vals.push(input.aktiv); }
  if (input.passwort  !== undefined) {
    felder.push(`passwort_hash = $${idx++}`);
    vals.push(await bcrypt.hash(input.passwort, 12));
  }
  vals.push(id);
  await query(`UPDATE sebo.benutzer SET ${felder.join(", ")} WHERE id = $${idx}`, vals);
}

export async function benutzerLoeschen(id: string): Promise<void> {
  // Soft-Delete via aktiv=false (Audit-Log bleibt erhalten)
  await query(`UPDATE sebo.benutzer SET aktiv = false WHERE id = $1`, [id]);
}
