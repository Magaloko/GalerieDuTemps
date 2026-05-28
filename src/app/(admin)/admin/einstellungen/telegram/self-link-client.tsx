"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Send, Copy, Unlink, Loader2, Bell } from "lucide-react";
import {
  adminTelegramLinkGenerierenAction,
  adminTelegramStatusAction,
  adminTelegramTrennenAction,
} from "./actions";

/* ──────────────────────────────────────────────────────────────────────────
 * AdminSelfLink — „Подключить мой Telegram" für den eingeloggten Admin.
 *
 * Anders als die Bot-Verbindung oben (das ist der Shop-Bot global), geht es
 * hier um die PERSÖNLICHE Verknüpfung des Admins: damit er Morning-Digest,
 * Lead-Pushes + Critical-Alerts bekommt und das Admin-Mini-App nutzen kann.
 * ────────────────────────────────────────────────────────────────────────── */
export function AdminSelfLink() {
  const [status, setStatus]   = useState<{ verknuepft: boolean; username: string | null } | null>(null);
  const [pending, start]      = useTransition();
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    adminTelegramStatusAction().then(setStatus).catch(() => setStatus({ verknuepft: false, username: null }));
  }, []);

  const generate = () => {
    setErr(null);
    start(async () => {
      const r = await adminTelegramLinkGenerierenAction();
      if (r.ok) setDeepLink(r.deepLink);
      else setErr(r.error);
    });
  };

  const trennen = () => {
    if (!confirm("Отвязать ваш Telegram? Вы перестанете получать уведомления.")) return;
    setErr(null);
    start(async () => {
      const r = await adminTelegramTrennenAction();
      if (r.ok) { setStatus({ verknuepft: false, username: null }); setDeepLink(null); }
      else setErr(r.error);
    });
  };

  const copy = async () => {
    if (!deepLink) return;
    try { await navigator.clipboard.writeText(deepLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <section className="bg-vintage-white border border-vintage-sand p-5 space-y-4"
             style={{ borderRadius: "var(--radius-card)" }}>
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-vintage-gold" />
        <h3 className="font-serif text-base text-vintage-espresso">Мои уведомления в Telegram</h3>
      </div>
      <p className="text-sm text-vintage-dust font-sans">
        Привяжите свой Telegram, чтобы получать утренний дайджест, новые лиды
        и важные алерты, а также пользоваться админ-режимом в Mini-App.
      </p>

      {status?.verknuepft ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-vintage-forest font-sans text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Подключено{status.username ? ` · @${status.username}` : ""}</span>
          </div>
          <button
            onClick={trennen}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-sans uppercase tracking-widest text-vintage-dust hover:text-vintage-burgundy transition-colors"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
            Отвязать
          </button>
        </div>
      ) : deepLink ? (
        <div className="space-y-3">
          <p className="text-sm text-vintage-ink font-sans">
            <strong>1.</strong> Откройте ссылку → бот → нажмите <code className="bg-vintage-parchment px-1.5 py-0.5 text-xs">/start</code>
          </p>
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors"
            style={{ borderRadius: "var(--radius-button)" }}
          >
            <Send className="w-3.5 h-3.5" /> Открыть бота
          </a>
          <div className="flex items-stretch gap-2">
            <input
              readOnly
              value={deepLink}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 text-xs font-mono bg-vintage-parchment border border-vintage-sand text-vintage-ink"
              style={{ borderRadius: "var(--radius-vintage)" }}
            />
            <button onClick={copy}
                    className="px-3 bg-vintage-gold text-vintage-cream"
                    style={{ borderRadius: "var(--radius-vintage)" }}
                    aria-label="Копировать">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-vintage-dust font-sans">
            После подтверждения обновите страницу — статус станет «Подключено».
          </p>
        </div>
      ) : (
        <button
          onClick={generate}
          disabled={pending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans uppercase tracking-widest hover:bg-vintage-brown transition-colors disabled:opacity-50"
          style={{ borderRadius: "var(--radius-button)" }}
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Подключить мой Telegram
        </button>
      )}

      {err && (
        <div className="flex items-start gap-2 px-3 py-2 bg-vintage-burgundy/10 border border-vintage-burgundy/30 text-sm text-vintage-burgundy"
             style={{ borderRadius: "var(--radius-vintage)" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{err}</span>
        </div>
      )}
    </section>
  );
}
