import { auth } from "@/lib/auth/config";
import { AppShell } from "../app-shell";

/* (today) — schmale App-Hülle für Сегодня + Меню. Auth/Provider kommen vom
   übergeordneten app/layout.tsx; hier nur die AppShell-Hülle. */
export default async function TodayLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return <AppShell userName={session?.user?.name}>{children}</AppShell>;
}
