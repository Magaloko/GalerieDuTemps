"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
 * PushToggle — Web-Push für Operator-Alerts an-/abschalten (Сегодня-Dashboard).
 *
 * Flow:
 *  1. Prüft Browser-Support (serviceWorker + PushManager + Notification).
 *  2. Liest aktuelle reg.pushManager.getSubscription() + Notification.permission.
 *  3. Klick „Включить" → requestPermission → subscribe → POST /api/push/subscribe.
 *  4. Klick (eingeschaltet) → unsubscribe + DELETE /api/push/subscribe.
 *
 * iOS: Web-Push funktioniert NUR in einer zum Home-Bildschirm hinzugefügten
 *      PWA (standalone). Sonst Hinweis statt Button.
 * ────────────────────────────────────────────────────────────────────────── */

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type State = "loading" | "unsupported" | "ios-needs-pwa" | "off" | "on" | "busy" | "denied";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        // iOS Safari < 16.4 oder Nicht-installierte PWA: Push gibt's nur als
        // installierte App (standalone). Eigener Hinweis.
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent ?? "");
        const standalone =
          (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
          window.matchMedia?.("(display-mode: standalone)").matches;
        if (!cancelled) setState(isIOS && !standalone ? "ios-needs-pwa" : "unsupported");
        return;
      }

      if (!VAPID_PUBLIC) {
        if (!cancelled) setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
    } catch (err) {
      console.error("[push enable]", err);
      setError("Не удалось включить уведомления");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setState("off");
    } catch (err) {
      console.error("[push disable]", err);
      setState("on");
    }
  }

  if (state === "loading") return null;

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid var(--color-line)",
    borderRadius: 10,
    padding: "12px 14px",
  };

  if (state === "unsupported") return null;

  if (state === "ios-needs-pwa") {
    return (
      <div style={cardStyle} className="flex items-start gap-2.5">
        <BellOff className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
        <p className="text-[12px]" style={{ color: "var(--color-ink-mute)", lineHeight: 1.5 }}>
          Уведомления на iPhone работают только в установленном приложении. Добавьте сайт на экран «Домой» через «Поделиться» → «На экран Домой».
        </p>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div style={cardStyle} className="flex items-start gap-2.5">
        <BellOff className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--color-ink-mute)" }} />
        <p className="text-[12px]" style={{ color: "var(--color-ink-mute)", lineHeight: 1.5 }}>
          Уведомления заблокированы в настройках браузера. Разрешите их, чтобы получать пуши о новых заказах и лидах.
        </p>
      </div>
    );
  }

  if (state === "on") {
    return (
      <div style={cardStyle} className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5 text-[12px]" style={{ color: "var(--color-ink)" }}>
          <BellRing className="w-4 h-4" style={{ color: "var(--color-coral)" }} />
          Уведомления включены
        </span>
        <button
          type="button"
          onClick={disable}
          className="text-[11px] uppercase font-medium"
          style={{ letterSpacing: "0.1em", color: "var(--color-ink-mute)", touchAction: "manipulation" }}
        >
          Выключить
        </button>
      </div>
    );
  }

  // state === "off" || "busy"
  return (
    <div>
      <button
        type="button"
        onClick={enable}
        disabled={state === "busy"}
        className="w-full flex items-center justify-center gap-2 py-3"
        style={{
          borderRadius: 10,
          touchAction: "manipulation",
          background: "#fff",
          border: "1px solid var(--color-line)",
          color: "var(--color-ink)",
          opacity: state === "busy" ? 0.6 : 1,
        }}
      >
        <Bell className="w-4 h-4" />
        <span className="text-[12px] uppercase font-medium" style={{ letterSpacing: "0.12em" }}>
          {state === "busy" ? "Подождите…" : "Включить уведомления"}
        </span>
      </button>
      {error && (
        <p className="text-[11px] mt-1.5" style={{ color: "var(--color-coral)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
