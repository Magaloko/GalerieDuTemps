import { randomBytes } from "crypto";
import { referralCodeExistiert } from "@/lib/db/affiliates";

// Crockford Base32 (ohne 0/O/I/L Verwechslungsgefahr)
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Generiert einen kryptografisch zufälligen Referral-Code (Default 8 Zeichen) */
export function generateReferralCode(laenge = 8): string {
  const bytes = randomBytes(laenge);
  let code = "";
  for (let i = 0; i < laenge; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Generiert einen einzigartigen Code (prüft DB auf Kollisionen) */
export async function generateUniqueReferralCode(maxVersuche = 5): Promise<string> {
  for (let i = 0; i < maxVersuche; i++) {
    const code = generateReferralCode(8);
    if (!(await referralCodeExistiert(code))) return code;
  }
  // Fallback: 10 Zeichen für noch geringere Kollisionswahrscheinlichkeit
  return generateReferralCode(10);
}

/** Validiert Format (für URL-Parameter) */
export function isValidReferralCode(code: string): boolean {
  return /^[0-9A-Z]{6,12}$/.test(code.toUpperCase());
}
