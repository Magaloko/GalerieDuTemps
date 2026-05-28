import { TelegramAuthGate } from "../auth-gate";
import { KontaktClient } from "./kontakt-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:  "Связаться · Galerie du Temps",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg/kontakt?produkt=<uuid>&name=<name>
 *
 * Direkt-Nachricht aus der Mini-App an den Kurator. Wenn ?produkt-Param
 * gesetzt → Form vorausgefüllt mit „Вопрос о товаре: ..." Betreff und
 * produkt_id mitgeschickt. Admin sieht Lead mit Produkt-Kontext im Inbox.
 *
 * Aufrufer:
 *  - Produkt-Detail-Page „Спросить куратора" Button
 *  - Profil-Page „Связаться" Link (ohne produkt-Param → general inquiry)
 *  - Tab-Bar (zukünftig) — optional 5. Tab „Контакт"
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TgKontaktPage({
  searchParams,
}: { searchParams: Promise<{ produkt?: string; name?: string; intent?: string }> }) {
  const sp = await searchParams;
  return (
    <TelegramAuthGate>
      <KontaktClient
        produktId={sp.produkt ?? null}
        produktName={sp.name ?? null}
        intent={sp.intent ?? null}
      />
    </TelegramAuthGate>
  );
}
