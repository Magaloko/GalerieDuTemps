"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

/* ──────────────────────────────────────────────────────────────────────────
 * PushSubscribeCustomer — „Уведомлять о новинках" für Shop-Besucher.
 *
 * Analog zu src/app/app/push-toggle.tsx (Operator), aber:
 *  - POST/DELETE gegen /api/push/subscribe-customer (öffentlich, kein Admin-Gate)
 *  - Dezent (eine Zeile), kein Auto-Prompt — Push erst auf Klick.
 *  - Russisch. Toast-Feedback bei Erfolg/Fehler.
 *
 * Wenn ServiceWorker/Push nicht unterstützt wird → rendert nichts (return null).
 * iOS: Web-Push nur in installierter PWA → eigener Hinweis statt Button.
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

export function PushSubscribeCustomer() {
  const [state, setState] = useState<State>("loading");
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
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
      const res = await fetch("/api/push/subscribe-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("on");
      toast.success("Уведомления о новинках включены");
    } catch (err) {
      console.error("[push-customer enable]", err);
      toast.error("Не удалось включить уведомления");
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe().catch(() => {});
        await fetch("/api/push/subscribe-customer", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
      setState("off");
      toast.info("Уведомления выключены");
    } catch (err) {
      console.error("[push-customer disable]", err);
      setState("on");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  const baseStyle: React.CSSProperties = {
    letterSpacing: "0.18em",
    touchAction: "manipulation",
  };

  if (state === "ios-needs-pwa") {
    return (
      <div className="inline-flex items-center gap-2 text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        <span style={{ lineHeight: 1.5 }}>
          Уведомления о новинках на iPhone — в установленном приложении («Поделиться» → «На экран Домой»).
        </span>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="inline-flex items-center gap-2 text-[11px]" style={{ color: "var(--color-ink-mute)" }}>
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        <span style={{ lineHeight: 1.5 }}>
          Уведомления заблокированы в настройках браузера.
        </span>
      </div>
    );
  }

  if (state === "on") {
    return (
      <div className="inline-flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-2 text-[11px] uppercase font-medium" style={{ ...baseStyle, color: "var(--color-ink)" }}>
          <BellRing className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
          Уведомления о новинках включены ✓
        </span>
        <button
          type="button"
          onClick={disable}
          className="text-[10px] uppercase font-medium hover:opacity-70 transition-opacity"
          style={{ ...baseStyle, color: "var(--color-ink-mute)" }}
        >
          Выключить
        </button>
      </div>
    );
  }

  // state === "off" || "busy"
  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "busy"}
      className="inline-flex items-center gap-2 px-3 py-2 text-[11px] uppercase font-medium transition-colors hover:bg-[var(--color-bone)]"
      style={{
        ...baseStyle,
        border: "1px solid var(--color-line)",
        color: "var(--color-ink)",
        opacity: state === "busy" ? 0.6 : 1,
      }}
    >
      <Bell className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
      {state === "busy" ? "Подождите…" : "🔔 Уведомлять о новинках"}
    </button>
  );
}
