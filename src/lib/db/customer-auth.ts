import { query } from "./index";
import { randomBytes } from "crypto";

const TOKEN_BYTES = 24;

/** Bestätigungs-Token für E-Mail generieren + speichern */
export async function emailConfirmationTokenSetzen(
  customerId: string,
  validHours = 48
): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  await query(
    `UPDATE sebo.customers
     SET email_confirmation_token = $1,
         email_confirmation_expires = now() + ($2 || ' hours')::interval
     WHERE id = $3`,
    [token, validHours, customerId]
  );
  return token;
}

/** Token einlösen → setzt email_bestaetigt_am */
export async function emailConfirmationEinloesen(token: string): Promise<string | null> {
  const r = await query<{ id: string }>(
    `UPDATE sebo.customers
     SET email_bestaetigt_am = now(),
         email_confirmation_token = NULL,
         email_confirmation_expires = NULL
     WHERE email_confirmation_token = $1
       AND email_confirmation_expires > now()
     RETURNING id`,
    [token]
  );
  return r.rows[0]?.id ?? null;
}

/** Passwort-Reset-Token generieren */
export async function passwortResetTokenSetzen(
  email: string,
  validHours = 2
): Promise<string | null> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const r = await query<{ id: string }>(
    `UPDATE sebo.customers
     SET password_reset_token = $1,
         password_reset_expires = now() + ($2 || ' hours')::interval
     WHERE email = $3
     RETURNING id`,
    [token, validHours, email.toLowerCase()]
  );
  if (!r.rows[0]) return null;
  return token;
}

/** Reset-Token einlösen + neues Passwort setzen */
export async function passwortResetEinloesen(
  token: string,
  neuerHash: string
): Promise<boolean> {
  const r = await query(
    `UPDATE sebo.customers
     SET passwort_hash = $1,
         password_reset_token = NULL,
         password_reset_expires = NULL
     WHERE password_reset_token = $2
       AND password_reset_expires > now()`,
    [neuerHash, token]
  );
  return (r.rowCount ?? 0) > 0;
}

/** Passwort ändern (eingeloggt) */
export async function customerPasswortAendern(
  customerId: string,
  neuerHash: string
): Promise<void> {
  await query(
    `UPDATE sebo.customers SET passwort_hash = $1 WHERE id = $2`,
    [neuerHash, customerId]
  );
}
