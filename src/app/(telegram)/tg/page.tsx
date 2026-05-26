import { Suspense } from "react";
import { katalogProdukte } from "@/lib/db/produkte-public";
import { TelegramAuthGate } from "./auth-gate";
import { TelegramCatalogClient } from "./catalog-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galerie du Temps · Telegram",
  robots: { index: false, follow: false },     // Mini-App-Pfad nicht für Google
};
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /tg — Mini-App-Einstieg
 *
 * Server-Component lädt die ersten 12 Produkte und reicht sie an den
 * Client. Der Client kümmert sich um:
 *  1. Telegram-WebApp-Init + Theme-Sync
 *  2. POST initData → /api/telegram/auth (setzt Session-Cookie)
 *  3. Katalog rendern
 *
 * Auth-Gate ist im Client, weil initData nur browserseitig verfügbar ist.
 * Die Pages-Routen daneben (/tg/produkt/[slug], /tg/cart) lesen dann den
 * Session-Cookie serverseitig.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function TelegramMiniAppHome() {
  const data = await katalogProdukte({ seite: 1, sortierung: "neu" }).catch(() => ({
    items: [], gesamt: 0, seite: 1, seiten: 0,
  }));

  return (
    <TelegramAuthGate>
      <Suspense fallback={<div className="p-6">…</div>}>
        <TelegramCatalogClient produkte={data.items} />
      </Suspense>
    </TelegramAuthGate>
  );
}
