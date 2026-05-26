"use client";

import { useState, useTransition } from "react";
import { Send, Check, Loader2, AlertCircle, Copy, X } from "lucide-react";
import {
  telegramTokenGenerierenAction,
  telegramEntfernenAction,
  telegramNotificationsToggleAction,
} from "./telegram-actions";

interface Props {
  customerId:      string;
  chatId:          number | null;
  username:        string | null;
  verknuepftAm:    string | null;
  notificationsAn: boolean;
  botUsername:     string | null;       // aus sebo.kanal_konten (z.B. "GalerieDuTempsBot")
}

/* ──────────────────────────────────────────────────────────────────────────
 * TelegramSection — Customer-Profile-Block für Telegram-Anbindung.
 *
 * Drei States:
 *   a) Bot ist nicht eingerichtet (botUsername == null) → Hinweis-Box
 *   b) Customer noch nicht verknüpft → Button „Telegram verknüpfen" generiert
 *      OTP-Token, zeigt Deep-Link + Copy-Helper + Anweisung
 *   c) Customer verknüpft → Status-Anzeige + Toggle für Notifications + Entfernen
 * ────────────────────────────────────────────────────────────────────────── */
export function TelegramSection({
  customerId, chatId, username, verknuepftAm, notificationsAn, botUsername,
}: Props) {
  const isLinked = Boolean(chatId);

  return (
    <section
      className="p-5"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <h2
          className="flex items-center gap-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize:   20,
            color:      "var(--color-ink)",
          }}
        >
          <Send className="w-5 h-5" style={{ color: "var(--color-coral)" }} />
          Telegram-Уведомления
        </h2>
        {isLinked && (
          <span
            className="px-2 py-0.5 text-[10px] uppercase font-medium"
            style={{
              letterSpacing: "0.22em",
              background:    "var(--color-coral)",
              color:         "#fff",
            }}
          >
            Связано
          </span>
        )}
      </header>

      {!botUsername ? (
        <BotNichtEingerichtet />
      ) : isLinked ? (
        <LinkedView
          customerId={customerId}
          username={username}
          verknuepftAm={verknuepftAm}
          notificationsAn={notificationsAn}
        />
      ) : (
        <UnlinkedView customerId={customerId} botUsername={botUsername} />
      )}
    </section>
  );
}

function BotNichtEingerichtet() {
  return (
    <div
      className="p-3 text-[13px]"
      style={{
        background: "var(--color-bone)",
        border:     "1px solid var(--color-line)",
        color:      "var(--color-ink-soft)",
      }}
    >
      Telegram-Bot noch nicht konfiguriert. Der Admin muss in
      <code className="mx-1 px-1.5 py-0.5" style={{
        background:"#fff", border:"1px solid var(--color-line)",
        fontFamily:"var(--font-mono)", fontSize:12,
      }}>
        /admin/einstellungen/telegram
      </code>
      einen Bot verbinden, bevor du dich verknüpfen kannst.
    </div>
  );
}

function UnlinkedView({ customerId, botUsername }: { customerId: string; botUsername: string }) {
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const r = await telegramTokenGenerierenAction(customerId);
      if (r.ok) setToken(r.token);
      else      setError(r.error);
    });
  };

  const deepLink = token
    ? `https://t.me/${botUsername.replace(/^@/, "")}?start=${token}`
    : null;

  return (
    <div className="space-y-4">
      <p
        className="text-[14px]"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
        }}
      >
        Bekomme Bestellbestätigung und Versandstatus direkt per Telegram statt nur per E-Mail.
      </p>

      {!token && (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="btn-coral"
          style={{ minHeight: 44, touchAction: "manipulation" }}
        >
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {pending ? "Generiert…" : "Telegram verknüpfen"}
        </button>
      )}

      {error && (
        <p
          className="px-3 py-2 text-[13px]"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep)",
          }}
        >
          <AlertCircle className="inline w-4 h-4 mr-1" /> {error}
        </p>
      )}

      {deepLink && (
        <div
          className="p-4 space-y-3"
          style={{
            background: "var(--color-bone)",
            border:     "1px solid var(--color-line)",
          }}
        >
          <p className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            <b>1.</b> Klicke auf den Link → Telegram öffnet sich → Sende <code
              className="px-1 mx-0.5"
              style={{ background: "#fff", border: "1px solid var(--color-line)",
                       fontFamily: "var(--font-mono)", fontSize: 12 }}
            >/start</code>
          </p>
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-coral btn-coral-lg w-full"
            style={{ minHeight: 48, touchAction: "manipulation" }}
          >
            <Send className="w-4 h-4" /> @{botUsername} öffnen
          </a>
          <details>
            <summary
              className="cursor-pointer text-[11px] uppercase font-medium"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              Link manuell kopieren
            </summary>
            <div className="mt-2 flex items-stretch gap-2">
              <input
                readOnly
                value={deepLink}
                className="flex-1 px-3 py-2 text-[12px]"
                style={{
                  background:  "#fff",
                  border:      "1px solid var(--color-line)",
                  fontFamily:  "var(--font-mono)",
                  color:       "var(--color-ink)",
                }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(deepLink); }}
                className="px-3"
                style={{
                  background: "var(--color-coral)",
                  color:      "#fff",
                  border:     "1px solid var(--color-coral)",
                }}
                aria-label="Link kopieren"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </details>
          <p className="text-[12px]" style={{
            color: "var(--color-ink-mute)",
            fontFamily: "var(--font-italic)", fontStyle: "italic",
          }}>
            Der Link bleibt gültig bis du ihn nutzt. Lade die Seite neu wenn du
            einen frischen Token brauchst.
          </p>
        </div>
      )}
    </div>
  );
}

function LinkedView({
  customerId, username, verknuepftAm, notificationsAn,
}: {
  customerId:      string;
  username:        string | null;
  verknuepftAm:    string | null;
  notificationsAn: boolean;
}) {
  const [aktiv, setAktiv] = useState(notificationsAn);
  const [pending, startTransition] = useTransition();
  const [unlinking, startUnlink]    = useTransition();
  const [error, setError]           = useState<string | null>(null);

  const toggle = () => {
    const neu = !aktiv;
    setAktiv(neu);
    startTransition(async () => {
      const r = await telegramNotificationsToggleAction(customerId, neu);
      if (!r.ok) { setError(r.error); setAktiv(!neu); }
    });
  };

  const entfernen = () => {
    if (!confirm("Verknüpfung wirklich aufheben? Du bekommst dann keine Telegram-Notifications mehr.")) return;
    setError(null);
    startUnlink(async () => {
      const r = await telegramEntfernenAction(customerId);
      if (!r.ok) setError(r.error);
      else       location.reload();
    });
  };

  const datum = verknuepftAm
    ? new Date(verknuepftAm).toLocaleDateString("ru-RU", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-y-2 text-[13px]">
        <dt style={{ color: "var(--color-ink-mute)" }}>Telegram</dt>
        <dd style={{ color: "var(--color-ink)" }}>
          {username ? `@${username}` : "(kein öffentlicher Username)"}
        </dd>
        <dt style={{ color: "var(--color-ink-mute)" }}>Verknüpft</dt>
        <dd style={{ color: "var(--color-ink)", fontFamily: "var(--font-italic)", fontStyle: "italic" }}>
          {datum}
        </dd>
      </dl>

      <label className="flex items-center justify-between gap-3 p-3"
             style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)" }}>
        <span className="text-[13px]" style={{ color: "var(--color-ink)" }}>
          Benachrichtigungen aktiv (Bestellungen, Versand)
        </span>
        <input
          type="checkbox"
          checked={aktiv}
          onChange={toggle}
          disabled={pending}
          style={{
            width: 20, height: 20, accentColor: "var(--color-coral)",
            touchAction: "manipulation",
          }}
        />
      </label>

      {error && (
        <p
          className="px-3 py-2 text-[13px]"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep)",
          }}
        >
          <AlertCircle className="inline w-4 h-4 mr-1" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={entfernen}
        disabled={unlinking}
        className="btn-coral btn-coral-ghost btn-coral-sm"
        style={{ minHeight: 40, touchAction: "manipulation" }}
      >
        {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        Verknüpfung aufheben
      </button>

      <p
        className="text-[12px]"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-mute)",
        }}
      >
        Tipp: Im Bot-Chat <code className="mx-0.5 px-1" style={{
          background:"#fff", border:"1px solid var(--color-line)",
          fontFamily:"var(--font-mono)", fontSize:11,
        }}>/unlink</code> macht dasselbe — direkt aus Telegram.
      </p>

      <p
        className="flex items-center gap-1.5 text-[11px] uppercase font-medium"
        style={{ letterSpacing: "0.18em", color: "var(--color-vintage-forest)" }}
      >
        <Check className="w-3 h-3" /> Verbindung aktiv
      </p>
    </div>
  );
}
