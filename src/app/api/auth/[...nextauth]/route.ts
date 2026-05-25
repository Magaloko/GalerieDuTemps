import { handlers } from "@/lib/auth/config";

// Exportiert GET + POST Handler für alle NextAuth-Routen:
// /api/auth/signin, /api/auth/signout, /api/auth/session, /api/auth/csrf etc.
export const { GET, POST } = handlers;
