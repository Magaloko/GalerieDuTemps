import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { b2bAntraegeListe } from "@/lib/db/customer-b2b";
import { B2bRow } from "./b2b-row";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "B2B-заявки · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminB2b() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const antraege = await b2bAntraegeListe("pending").catch(() => []);

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Клиенты" titel="Заявки B2B" sub={`${antraege.length} на рассмотрении`} />
        {antraege.length === 0 ? (
          <AdminEmpty text="Нет заявок на рассмотрении. ✓" />
        ) : (
          <div className="space-y-2">
            {antraege.map(a => (
              <B2bRow
                key={a.id}
                id={a.id}
                name={[a.vorname, a.nachname].filter(Boolean).join(" ") || a.email}
                email={a.email}
                company={a.company_name}
                ustId={a.ust_id}
                note={a.company_note}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
