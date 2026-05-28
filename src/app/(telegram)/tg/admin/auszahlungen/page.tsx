import { getWebAppSession } from "@/lib/telegram/webapp-session";
import { TelegramAuthGate } from "../../auth-gate";
import { AdminBack, AdminHeader, AdminEmpty, AdminNotAllowed } from "../_ui";
import { alleAuszahlungen } from "@/lib/db/auszahlungen";
import { AuszahlungRow } from "./auszahlung-row";
import { formatPreis } from "@/lib/utils/preis";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Выплаты · Mini-App", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TgAdminAuszahlungen() {
  const session = await getWebAppSession();
  if (!session || session.role !== "admin") {
    return <TelegramAuthGate><AdminNotAllowed /></TelegramAuthGate>;
  }
  const offen = await alleAuszahlungen({ status: "erstellt", limit: 50 }).catch(() => []);
  const summe = offen.reduce((a, x) => a + x.betrag_cent, 0);

  return (
    <TelegramAuthGate>
      <main className="p-4 pb-8">
        <AdminBack />
        <AdminHeader eyebrow="✦ Партнёры" titel="Выплаты" sub={`${offen.length} к выплате · ${formatPreis(summe / 100)}`} />
        {offen.length === 0 ? (
          <AdminEmpty text="Нет выплат в очереди. ✓" />
        ) : (
          <div className="space-y-2">
            {offen.map(a => (
              <AuszahlungRow
                key={a.id}
                id={a.id}
                name={a.affiliate_name}
                email={a.affiliate_email}
                betrag={formatPreis(a.betrag_cent / 100)}
              />
            ))}
          </div>
        )}
      </main>
    </TelegramAuthGate>
  );
}
