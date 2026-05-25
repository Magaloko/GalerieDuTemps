import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";

// ---------------------------------------------------------------------------
// Validierungs-Schema für Login-Eingaben
// ---------------------------------------------------------------------------
const LoginSchema = z.object({
  email:    z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export type AuthRole = "admin" | "superadmin" | "affiliate" | "customer";

interface AuthUser {
  id:    string;
  email: string;
  name:  string;
  role:  AuthRole;
}

// ---------------------------------------------------------------------------
// Lookup-Helper: prüft beide Tabellen (Admin zuerst, dann Affiliate)
// ---------------------------------------------------------------------------
async function findeUser(email: string, password: string): Promise<AuthUser | null> {
  const lcEmail = email.toLowerCase();

  // 1. Admin/Superadmin in sebo.benutzer
  try {
    const adminRes = await query<{
      id: string; email: string; name: string | null;
      passwort_hash: string; rolle: string; aktiv: boolean;
    }>(
      `SELECT id, email, name, passwort_hash, rolle, aktiv
       FROM sebo.benutzer WHERE email = $1 LIMIT 1`,
      [lcEmail]
    );
    const admin = adminRes.rows[0];
    if (admin && admin.aktiv) {
      const ok = await bcrypt.compare(password, admin.passwort_hash);
      if (ok) {
        return {
          id:    admin.id,
          email: admin.email,
          name:  admin.name ?? admin.email,
          role:  (admin.rolle === "superadmin" ? "superadmin" : "admin") as AuthRole,
        };
      }
    }
  } catch (err) {
    console.error("[Auth] Admin-Lookup Fehler:", err);
  }

  // 2. Affiliate in sebo.affiliates (nur aktive)
  try {
    const affRes = await query<{
      id: string; email: string; vorname: string; nachname: string;
      passwort_hash: string; status: string;
    }>(
      `SELECT id, email, vorname, nachname, passwort_hash, status
       FROM sebo.affiliates WHERE email = $1 LIMIT 1`,
      [lcEmail]
    );
    const aff = affRes.rows[0];
    if (aff && aff.status === "aktiv") {
      const ok = await bcrypt.compare(password, aff.passwort_hash);
      if (ok) {
        // letzten Login tracken (non-blocking)
        query(
          `UPDATE sebo.affiliates SET letzter_login_am = now() WHERE id = $1`,
          [aff.id]
        ).catch(() => {});
        return {
          id:    aff.id,
          email: aff.email,
          name:  `${aff.vorname} ${aff.nachname}`,
          role:  "affiliate",
        };
      }
    }
  } catch (err) {
    console.error("[Auth] Affiliate-Lookup Fehler:", err);
  }

  // 3. Customer in sebo.customers (E-Mail bestätigt + Passwort gesetzt)
  try {
    const custRes = await query<{
      id: string; email: string; vorname: string | null; nachname: string | null;
      passwort_hash: string | null; email_bestaetigt_am: string | null;
    }>(
      `SELECT id, email, vorname, nachname, passwort_hash, email_bestaetigt_am
       FROM sebo.customers WHERE email = $1 LIMIT 1`,
      [lcEmail]
    );
    const cust = custRes.rows[0];
    if (cust && cust.passwort_hash && cust.email_bestaetigt_am) {
      const ok = await bcrypt.compare(password, cust.passwort_hash);
      if (ok) {
        query(
          `UPDATE sebo.customers SET letzter_login_am = now() WHERE id = $1`,
          [cust.id]
        ).catch(() => {});
        return {
          id:    cust.id,
          email: cust.email,
          name:  [cust.vorname, cust.nachname].filter(Boolean).join(" ") || cust.email,
          role:  "customer",
        };
      }
    }
  } catch (err) {
    console.error("[Auth] Customer-Lookup Fehler:", err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// NextAuth v5 Konfiguration
// ---------------------------------------------------------------------------
const authConfig: NextAuthConfig = {
  // PFLICHT bei Reverse-Proxy-Setup (Coolify/Caddy/Traefik) — sonst:
  // "UntrustedHost: Host must be trusted" bei /api/auth/session
  // Alternativ ENV: AUTH_TRUST_HOST=true
  trustHost: true,

  providers: [
    Credentials({
      name: "Anmeldedaten",
      credentials: {
        email:    { label: "E-Mail",   type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findeUser(parsed.data.email, parsed.data.password);
        if (!user) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
          // Legacy 'rolle' Feld für Rückwärtskompatibilität
          rolle: user.role === "affiliate" ? "admin" : user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge:   8 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? "admin";
        // Legacy
        token.rolle = (user as { rolle?: string }).rolle ?? "admin";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id   as string;
        session.user.role  = (token.role  ?? "admin") as AuthRole;
        session.user.rolle = (token.rolle ?? "admin") as "admin" | "superadmin";
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path:     "/",
        secure:   process.env.NODE_ENV === "production",
      },
    },
  },

  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
