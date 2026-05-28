"use client";

import { useState, useTransition } from "react";
import {
  Send, Check, Loader2, AlertCircle, Copy, X, QrCode, ExternalLink,
} from "lucide-react";
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
  /** aus sebo.kanal_konten (z.B. "GalerieDuTempsBot") — null wenn Admin
   *  noch keinen Bot konfiguriert hat. */
  botUsername:     string | null;
}

/* ──────────────────────────────────────────────────────────────────────────
 * TelegramSection — Customer-Telegram-Anbindung im /kunde/profil.
 *
 * Drei mögliche States:
 *   a) Bot ist nicht eingerichtet (botUsername == null) → Info-Box
 *   b) Customer noch nicht verknüpft → UnlinkedView mit OTP-Token-Generator,
 *      Deep-Link, QR-Code und Copy-Helper
 *   c) Customer verknüpft → LinkedView mit Toggle für Notifications +
 *      „Verknüpfung aufheben" Button
 *
 * Sprache: durchgehend Russisch (Customer-Area-Standard).
 * ────────────────────────────────────────────────────────────────────────── */
export function TelegramSection({
  customerId, chatId, username, verknuepftAm, notificationsAn, botUsername,
}: Props) {
  const isLinked = Boolean(chatId);

  return (
    <section
      className="p-6"
      style={{ background: "#fff", border: "1px solid var(--color-line)" }}
    >
      <header className="flex items-center justify-between gap-3 pb-3 mb-4"
              style={{ borderBottom: "1px solid var(--color-line)" }}>
        <h2
          className="flex items-center gap-2 text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink)" }}
        >
          <Send className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
          Telegram-уведомления
        </h2>
        {isLinked && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase font-medium"
            style={{
              letterSpacing: "0.22em",
              background:    "rgba(127,140,90,0.10)",
              color:         "#52663F",
              border:        "1px solid rgba(127,140,90,0.40)",
            }}
          >
            <Check className="w-3 h-3" /> Подключено
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

/* ── Bot-nicht-eingerichtet-Hinweis (Admin-Aufgabe) ─────────────────── */
function BotNichtEingerichtet() {
  return (
    <div
      className="flex items-start gap-2.5 p-3 text-sm"
      style={{
        background: "var(--color-bone)",
        border:     "1px solid var(--color-line)",
        color:      "var(--color-ink-soft)",
      }}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-coral)" }} />
      <p>
        Telegram-бот пока не настроен. Администратор должен подключить бота в{" "}
        <code
          className="px-1.5 py-0.5 mx-0.5"
          style={{
            background: "#fff",
            border:     "1px solid var(--color-line)",
            fontFamily: "var(--font-mono)",
            fontSize:   12,
          }}
        >
          /admin/einstellungen/telegram
        </code>{" "}
        прежде чем вы сможете подключить уведомления.
      </p>
    </div>
  );
}

/* ── Unlinked: Token generieren + Deep-Link + QR ─────────────────────── */
function UnlinkedView({ customerId, botUsername }: { customerId: string; botUsername: string }) {
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = async () => {
    if (!deepLink) return;
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  // QR-Code via öffentlichen Renderer (gleiche Anbieter wie auf der
  // Produkt-Detail-Page) — keine zusätzliche Dependency, server-side
  // bauen wir kein Bild auf.
  const qrSrc = deepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(deepLink)}&color=2C2420&bgcolor=FAFAF8`
    : null;

  return (
    <div className="space-y-4">
      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-soft)",
          lineHeight: 1.6,
        }}
      >
        Получайте подтверждения заказов и статус доставки прямо в Telegram —
        быстрее чем по e-mail.
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
          {pending ? "Генерируем…" : "Подключить Telegram"}
        </button>
      )}

      {error && (
        <p
          className="flex items-start gap-2 px-3 py-2 text-sm"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep, #A53E26)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {deepLink && (
        <div
          className="p-5 space-y-4"
          style={{
            background: "var(--color-bone)",
            border:     "1px solid var(--color-line)",
          }}
        >
          {/* Instruction */}
          <p className="text-sm" style={{ color: "var(--color-ink-soft)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--color-ink)" }}>1.</strong>{" "}
            Откройте ссылку → Telegram запустится → нажмите{" "}
            <code
              className="px-1 mx-0.5"
              style={{
                background: "#fff",
                border:     "1px solid var(--color-line)",
                fontFamily: "var(--font-mono)",
                fontSize:   12,
              }}
            >/start</code>
          </p>

          {/* Primary CTA — Open in Telegram */}
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-coral btn-coral-lg w-full"
            style={{ minHeight: 48, touchAction: "manipulation" }}
          >
            <Send className="w-4 h-4" /> Открыть @{botUsername}
          </a>

          {/* Desktop: QR-Code für Scan vom Phone */}
          {qrSrc && (
            <div
              className="hidden sm:flex flex-col items-center gap-2 pt-3"
              style={{ borderTop: "1px dashed var(--color-line)" }}
            >
              <p
                className="flex items-center gap-1.5 text-[10px] uppercase font-medium"
                style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
              >
                <QrCode className="w-3 h-3" /> или отсканируйте с телефона
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR-код для подключения Telegram"
                width={140}
                height={140}
                style={{
                  background: "#fff",
                  border:     "1px solid var(--color-line)",
                  padding:    8,
                }}
              />
            </div>
          )}

          {/* Copy-Link details */}
          <details>
            <summary
              className="cursor-pointer text-[11px] uppercase font-medium transition-colors hover:text-[var(--color-ink)]"
              style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
            >
              Скопировать ссылку
            </summary>
            <div className="mt-2 flex items-stretch gap-2">
              <input
                readOnly
                value={deepLink}
                className="flex-1 px-3 py-2 text-xs focus:outline-none"
                style={{
                  background: "#fff",
                  border:     "1px solid var(--color-line)",
                  fontFamily: "var(--font-mono)",
                  color:      "var(--color-ink)",
                  minHeight:  40,
                }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 flex items-center gap-1.5 text-xs uppercase font-medium transition-colors"
                style={{
                  letterSpacing: "0.18em",
                  background:    copied ? "#52663F" : "var(--color-coral)",
                  color:         "#fff",
                  border:        "1px solid transparent",
                  minHeight:     40,
                }}
                aria-label="Скопировать ссылку"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /> ✓</>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </details>

          <p
            className="text-xs"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            Ссылка действует до первого использования. Обновите страницу, если
            нужен свежий токен.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Linked: Toggle + Unlink ─────────────────────────────────────────── */
function LinkedView({
  customerId, username, verknuepftAm, notificationsAn,
}: {
  customerId:      string;
  username:        string | null;
  verknuepftAm:    string | null;
  notificationsAn: boolean;
}) {
  const [aktiv, setAktiv]           = useState(notificationsAn);
  const [pending, startTransition]  = useTransition();
  const [unlinking, startUnlink]    = useTransition();
  const [error, setError]           = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggle = () => {
    const neu = !aktiv;
    setAktiv(neu);
    setError(null);
    startTransition(async () => {
      const r = await telegramNotificationsToggleAction(customerId, neu);
      if (!r.ok) { setError(r.error); setAktiv(!neu); }
    });
  };

  const entfernen = () => {
    setError(null);
    startUnlink(async () => {
      const r = await telegramEntfernenAction(customerId);
      if (!r.ok) {
        setError(r.error);
      } else {
        location.reload();
      }
    });
  };

  const datum = verknuepftAm
    ? new Date(verknuepftAm).toLocaleDateString("ru-RU", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-5">

      {/* ── Meta ────────────────────────────────────────────── */}
      <dl
        className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm pb-4"
        style={{ borderBottom: "1px dashed var(--color-line)" }}
      >
        <dt
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          Telegram
        </dt>
        <dd className="font-mono" style={{ color: "var(--color-ink)" }}>
          {username ? `@${username}` : <span style={{ color: "var(--color-ink-mute)", fontFamily: "var(--font-italic)", fontStyle: "italic" }}>(без публичного имени)</span>}
        </dd>
        <dt
          className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--color-ink-mute)" }}
        >
          Подключено
        </dt>
        <dd
          style={{
            fontFamily: "var(--font-italic)",
            fontStyle:  "italic",
            color:      "var(--color-ink-soft)",
          }}
        >
          {datum}
        </dd>
      </dl>

      {/* ── Notifications-Toggle ──────────────────────────── */}
      <label
        className="flex items-center justify-between gap-3 p-4 cursor-pointer"
        style={{
          background: "var(--color-bone)",
          border:     "1px solid var(--color-line)",
        }}
      >
        <div className="min-w-0">
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-display)",
              color:      "var(--color-ink)",
            }}
          >
            Уведомления включены
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{
              fontFamily: "var(--font-italic)",
              fontStyle:  "italic",
              color:      "var(--color-ink-mute)",
            }}
          >
            Заказы, оплата, доставка
          </p>
        </div>
        <Switch checked={aktiv} disabled={pending} onChange={toggle} />
      </label>

      {error && (
        <p
          className="flex items-start gap-2 px-3 py-2 text-sm"
          style={{
            background: "rgba(232,112,58,0.08)",
            border:     "1px solid rgba(232,112,58,0.35)",
            color:      "var(--color-coral-deep, #A53E26)",
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {/* ── Hint /unlink ──────────────────────────────────── */}
      <p
        className="flex items-start gap-2 text-xs"
        style={{
          fontFamily: "var(--font-italic)",
          fontStyle:  "italic",
          color:      "var(--color-ink-mute)",
          lineHeight: 1.5,
        }}
      >
        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 not-italic" />
        <span>
          В чате с ботом команда{" "}
          <code
            className="px-1 mx-0.5 not-italic"
            style={{
              background: "var(--color-bone)",
              border:     "1px solid var(--color-line)",
              fontFamily: "var(--font-mono)",
              fontStyle:  "normal",
              fontSize:   11,
              color:      "var(--color-ink)",
            }}
          >
            /unlink
          </code>{" "}
          сделает то же самое — прямо из Telegram.
        </span>
      </p>

      {/* ── Unlink Button mit Confirm ─────────────────────── */}
      {confirmOpen ? (
        <div
          className="p-3 space-y-3"
          style={{
            background: "rgba(232,112,58,0.06)",
            border:     "1px solid rgba(232,112,58,0.30)",
          }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--color-ink)" }}
          >
            Точно отвязать? Уведомления перестанут приходить.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={entfernen}
              disabled={unlinking}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-medium transition-colors"
              style={{
                letterSpacing: "0.22em",
                background:    "var(--color-coral)",
                color:         "#fff",
                minHeight:     40,
              }}
            >
              {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Отвязать
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={unlinking}
              className="flex-1 py-2 text-[11px] uppercase font-medium transition-colors"
              style={{
                letterSpacing: "0.22em",
                background:    "#fff",
                color:         "var(--color-ink-soft)",
                border:        "1px solid var(--color-line)",
                minHeight:     40,
              }}
            >
              Оставить
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase font-medium transition-colors hover:text-[var(--color-coral-deep,#A53E26)]"
          style={{
            letterSpacing: "0.22em",
            color:         "var(--color-ink-mute)",
          }}
        >
          <X className="w-3 h-3" /> Отвязать аккаунт
        </button>
      )}
    </div>
  );
}

/* ── Custom Switch (besser als nativer Checkbox optisch) ──────────── */
function Switch({
  checked, disabled, onChange,
}: {
  checked:  boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="relative shrink-0 transition-colors disabled:opacity-50"
      style={{
        width:        40,
        height:       22,
        background:   checked ? "var(--color-coral)" : "var(--color-line)",
        borderRadius: 999,
        cursor:       disabled ? "wait" : "pointer",
      }}
    >
      <span
        aria-hidden
        className="absolute top-0.5 transition-transform"
        style={{
          width:        18,
          height:       18,
          background:   "#fff",
          borderRadius: "50%",
          transform:    checked ? "translateX(20px)" : "translateX(2px)",
          boxShadow:    "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
