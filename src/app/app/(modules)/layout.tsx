import { auth } from "@/lib/auth/config";
import { AppShell } from "../app-shell";

/* (modules) — volle Breite App-Hülle für die unter /app gespiegelten
   /admin-Module (Tabellen/Editoren). Auth/Provider kommen vom übergeordneten
   app/layout.tsx. */
export default async function ModulesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <AppShell userName={session?.user?.name} fluid>
      {children}
    </AppShell>
  );
}
