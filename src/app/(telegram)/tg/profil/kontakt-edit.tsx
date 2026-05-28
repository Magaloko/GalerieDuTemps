"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Phone } from "lucide-react";
import { kontaktdatenSpeichernAction } from "./actions";
import { haptic } from "../fx";

type Kanal = "" | "telegram" | "telefon" | "whatsapp" | "email";

const KANAL_OPT: { v: Kanal; l: string }[] = [
  { v: "",         l: "— без предпочтения —" },
  { v: "telegram", l: "Telegram" },
  { v: "telefon",  l: "Телефон (звонок)" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "email",    l: "E-mail" },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Kunden-Kontaktdaten editieren (Mini-App).
 *
 * Damit der Kurator weiß, WIE er zurück erreichen soll. E-Mail ist read-only
 * (Login-Identität → Änderung auf der Website). Telegram-Handle wird ohne @
 * gespeichert.
 * ────────────────────────────────────────────────────────────────────────── */
export function KontaktEdit({
  initial,
}: {
  initial: {
    telefon:           string | null;
    whatsapp:          string | null;
    telegram_username: string | null;
    kontakt_kanal:     string | null;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; t: string } | null>(null);

  const [telefon,  setTelefon]  = useState(initial.telefon ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "");
  const [tgUser,   setTgUser]   = useState(initial.telegram_username ?? "");
  const [kanal,    setKanal]    = useState<Kanal>((initial.kontakt_kanal as Kanal) ?? "");

  const save = () => start(async () => {
    const r = await kontaktdatenSpeichernAction({
      telefon, whatsapp, telegram_username: tgUser, kontakt_kanal: kanal,
    });
    if (r.ok) { haptic("success"); setFlash({ ok: true, t: "Сохранено" }); router.refresh(); }
    else { haptic("error"); setFlash({ ok: false, t: r.error }); }
    setTimeout(() => setFlash(null), 2200);
  });

  return (
    <section className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--color-line)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Phone className="w-3.5 h-3.5" style={{ color: "var(--color-coral)" }} />
        <p className="text-[10px] uppercase font-medium"
          style={{ letterSpacing: "0.22em", color: "var(--tg-theme-hint-color, var(--color-ink-mute))" }}>
          Как с вами связаться
        </p>
      </div>

      <Field label="Телефон"          value={telefon}  onChange={setTelefon}  type="tel"  placeholder="+7 7XX XXX XX XX" />
      <Field label="WhatsApp"         value={whatsapp} onChange={setWhatsapp} type="tel"  placeholder="+7 7XX XXX XX XX" />
      <Field label="Telegram (@username)" value={tgUser} onChange={setTgUser}  placeholder="username" />

      <label className="block">
        <span className="block mb-1 text-[10px] uppercase"
          style={{ letterSpacing: "0.16em", color: "var(--tg-theme-hint-color, var(--color-ink-soft))" }}>
          Предпочтительный канал
        </span>
        <select
          value={kanal}
          onChange={e => setKanal(e.target.value as Kanal)}
          className="w-full px-2.5 py-2 text-sm"
          style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
        >
          {KANAL_OPT.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </label>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] uppercase font-medium disabled:opacity-50"
          style={{ letterSpacing: "0.18em", background: "var(--color-coral)", color: "#fff", touchAction: "manipulation" }}
        >
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
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-2 text-sm"
        style={{ background: "var(--color-bone)", border: "1px solid var(--color-line)", color: "var(--tg-theme-text-color, var(--color-ink))" }}
      />
    </label>
  );
}
