"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Bell, BellOff, Phone } from "lucide-react";
import { adminNotificationsToggleAction, adminProfilKontaktAction } from "../actions";
import { haptic } from "../../fx";

type Kanal = "" | "telegram" | "telefon" | "whatsapp" | "email";

const KANAL_OPT: { v: Kanal; l: string }[] = [
  { v: "",         l: "— без предпочтения —" },
  { v: "telegram", l: "Telegram" },
  { v: "telefon",  l: "Телефон (звонок)" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "email",    l: "E-mail" },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Admin-Profil-Client: Benachrichtigungs-Schalter + eigene Kontaktdaten.
 * Telegram-Verknüpfung ist read-only (der Admin ist bereits verknüpft — ein
 * Trennen würde ihn aus der Admin-Mini-App aussperren).
 * ────────────────────────────────────────────────────────────────────────── */
export function AdminProfilClient({
  initial,
}: {
  initial: {
    notifications_aktiv: boolean;
    telefon:             string | null;
    whatsapp:            string | null;
    kontakt_kanal:       string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; t: string } | null>(null);

  const [notif,    setNotif]    = useState(initial.notifications_aktiv);
  const [telefon,  setTelefon]  = useState(initial.telefon ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "");
  const [kanal,    setKanal]    = useState<Kanal>((initial.kontakt_kanal as Kanal) ?? "");

  const flashMsg = (ok: boolean, t: string) => { setFlash({ ok, t }); setTimeout(() => setFlash(null), 2200); };

  const toggleNotif = () => start(async () => {
    const next = !notif;
    setNotif(next); // optimistisch
    const r = await adminNotificationsToggleAction(next);
    if (r.ok) { haptic("success"); }
    else { setNotif(!next); haptic("error"); flashMsg(false, r.error); }
  });

  const saveKontakt = () => start(async () => {
    const r = await adminProfilKontaktAction({ telefon, whatsapp, kontakt_kanal: kanal });
    if (r.ok) { haptic("success"); flashMsg(true, "Сохранено"); router.refresh(); }
    else { haptic("error"); flashMsg(false, r.error); }
  });

  return (
    <div className="space-y-5">
      {/* Notifications-Schalter */}
      <section className="space-y-2">
        <p className="text-[10px] uppercase font-medium px-1"
          style={{ letterSpacing: "0.24em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          Уведомления
        </p>
        <button
          type="button"
          onClick={toggleNotif}
          disabled={pending}
          className="w-full flex items-center gap-3 p-3 disabled:opacity-60"
          style={{ background: "var(--tg-theme-section-bg-color, #fff)", border: "1px solid var(--color-line)", touchAction: "manipulation" }}
        >
          {notif ? <Bell className="w-4 h-4 shrink-0" style={{ color: "var(--color-coral)" }} />
                 : <BellOff className="w-4 h-4 shrink-0" style={{ color: "var(--color-ink-mute)" }} />}
          <span className="flex-1 text-left text-sm" style={{ color: "var(--tg-theme-text-color, var(--color-ink))" }}>
            Push о новых сообщениях
          </span>
          {/* Toggle-Pill */}
          <span className="relative inline-block" style={{
            width: 42, height: 24, borderRadius: 999,
            background: notif ? "var(--color-coral)" : "var(--color-line)", transition: "background 150ms",
          }}>
            <span className="absolute" style={{
              top: 3, left: notif ? 21 : 3, width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left 150ms",
            }} />
          </span>
        </button>
        <p className="text-[11px] px-1" style={{ fontStyle: "italic", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          {notif
            ? "Вы получаете личные сообщения от бота о новых лидах."
            : "Push выключены — новые сообщения видны только в Inbox."}
        </p>
      </section>

      {/* Eigene Kontaktdaten */}
      <section className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--color-line)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
          <p className="text-[10px] uppercase font-medium"
            style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
            Мои контакты
          </p>
        </div>

        <Field label="Телефон"  value={telefon}  onChange={setTelefon}  type="tel" placeholder="+7 7XX XXX XX XX" />
        <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} type="tel" placeholder="+7 7XX XXX XX XX" />

        <label className="block">
          <span className="block mb-1 text-[10px] uppercase"
            style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
            Предпочтительный канал
          </span>
          <select value={kanal} onChange={e => setKanal(e.target.value as Kanal)}
            className="w-full px-2.5 py-2 text-sm"
            style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}>
            {KANAL_OPT.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button type="button" disabled={pending} onClick={saveKontakt}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] uppercase font-medium disabled:opacity-50"
            style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", touchAction: "manipulation" }}>
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Сохранить
          </button>
          {flash && (
            <span className="text-[11px]" style={{ color: flash.ok ? "#52663F" : "var(--color-coral-deep, #A53E26)" }}>
              {flash.t}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-[10px] uppercase"
        style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
        {label}
      </span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm"
        style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }} />
    </label>
  );
}
