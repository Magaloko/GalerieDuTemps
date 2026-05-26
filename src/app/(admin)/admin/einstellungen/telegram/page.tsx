import Link from "next/link";
import { query } from "@/lib/db";
import { TelegramSetupClient } from "./client";
import { ChevronLeft, Send } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Telegram-Bot" };
export const dynamic = "force-dynamic";

interface KontoData {
  id:         number;
  username:   string | null;
  account_id: string | null;
  webhook_verify_token: string | null;
  aktiv:      boolean;
  erstellt_am: string;
}

export default async function TelegramSetupPage() {
  const r = await query<KontoData>(
    `SELECT id, username, account_id, webhook_verify_token, aktiv, erstellt_am
     FROM sebo.kanal_konten
     WHERE kanal = 'telegram'
     ORDER BY id DESC LIMIT 1`
  );
  const konto = r.rows[0] ?? null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://galerie.apps.dadakaev.tech";
  const webhookUrl = konto?.webhook_verify_token
    ? `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook/${konto.webhook_verify_token}`
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
        <Link href="/admin/einstellungen" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Einstellungen
        </Link>
        <span>/</span>
        <span className="text-vintage-ink">Telegram</span>
      </div>

      <div>
        <p className="text-vintage-gold text-xs tracking-widest">✦</p>
        <h1 className="font-serif text-2xl text-vintage-espresso flex items-center gap-2">
          <Send className="w-5 h-5 text-vintage-gold" /> Telegram-Bot
        </h1>
        <p className="text-vintage-dust text-xs font-sans mt-0.5">
          Eingehende Nachrichten an deinen Telegram-Bot landen automatisch als Leads in der Inbox.
        </p>
      </div>

      {/* Setup-Anleitung */}
      <section className="bg-vintage-parchment border border-vintage-sand p-6 space-y-3"
               style={{ borderRadius: "var(--radius-card)" }}>
        <h2 className="font-serif text-base text-vintage-espresso">Setup in 5 Minuten</h2>
        <ol className="text-sm text-vintage-ink space-y-2 list-decimal pl-5">
          <li>Telegram öffnen → <code className="bg-vintage-white px-1.5 py-0.5 text-xs">@BotFather</code> suchen → Chat starten</li>
          <li>Befehl <code className="bg-vintage-white px-1.5 py-0.5 text-xs">/newbot</code> senden, Anweisungen folgen (Bot-Name, Username)</li>
          <li>BotFather gibt einen <strong>HTTP API Token</strong> aus (Format: <code className="bg-vintage-white px-1.5 py-0.5 text-xs">123456:ABC...</code>)</li>
          <li>Token unten einfügen → „Verbinden" → wir validieren + setzen den Webhook automatisch</li>
          <li>Fertig — schicke dem Bot eine Test-Nachricht, sie sollte in <Link href="/admin/leads?quelle=telegram" className="text-vintage-gold underline">/admin/leads</Link> erscheinen</li>
        </ol>
      </section>

      <TelegramSetupClient
        verbunden={konto?.aktiv === true}
        username={konto?.username ?? null}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
