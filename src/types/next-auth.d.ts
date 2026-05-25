import type { DefaultSession, DefaultJWT } from "next-auth";

// ---------------------------------------------------------------------------
// Session Type Augmentation
// Erweitert um `role` (admin/superadmin/affiliate) + legacy `rolle`
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id:    string;
      role:  "admin" | "superadmin" | "affiliate" | "customer";
      /** @deprecated Legacy field. Use `role` instead. */
      rolle: "admin" | "superadmin";
    };
  }

  interface User {
    role?:  string;
    rolle?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?:    string;
    role?:  string;
    /** @deprecated */
    rolle?: string;
  }
}
