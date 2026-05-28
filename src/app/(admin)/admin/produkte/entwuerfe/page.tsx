import Link from "next/link";
import { ChevronLeft, ImagePlus, Inbox } from "lucide-react";
import { entwuerfeListe } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { EntwurfRowClient } from "./entwurf-row";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Черновики · на проверку" };
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * /admin/produkte/entwuerfe — Review-Queue für Draft-Produkte.
 *
 * Sammelpunkt aller Entwürfe (Foto-Bulk-Upload + Telegram-Foto). Pro Eintrag:
 * KI-Ausfüllen, Preis/Kategorie/Zustand setzen, Veröffentlichen, Löschen.
 * ────────────────────────────────────────────────────────────────────────── */
export default async function EntwuerfePage() {
  const [entwuerfe, kategorien] = await Promise.all([
    entwuerfeListe(100),
    alleKategorien(),
  ]);
  const katOptions = kategorien.map(k => ({ value: String(k.id), label: k.name }));

  return (
    <div className="max-w-5xl space-y-6">
      <nav className="text-[11px] uppercase font-medium flex items-center gap-2" style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}>
        <Link href="/admin/produkte" className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Товары
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Черновики</span>
      </nav>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase font-medium mb-1" style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}>
            ✦ На проверку
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-ink)" }}>
            Черновики · {entwuerfe.length}
          </h1>
        </div>
        <Link
          href="/admin/produkte/bulk"
          className="inline-flex items-center gap-2 text-[11px] uppercase font-medium px-3 py-2"
          style={{ letterSpacing: "0.22em", background: "var(--color-coral)", color: "#fff" }}
        >
          <ImagePlus className="w-3.5 h-3.5" /> Загрузить фото пачкой
        </Link>
      </header>

      {entwuerfe.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center" style={{ color: "var(--color-ink-mute)" }}>
          <Inbox className="w-10 h-10 opacity-40" />
          <p className="text-sm">Нет черновиков. Загрузите фото пачкой или пришлите фото боту в Telegram.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entwuerfe.map(e => (
            <EntwurfRowClient
              key={e.id}
              entwurf={{
                id:            e.id,
                name:          e.name,
                hasNotizen:    [e.name, e.beschreibung ?? ""].join(" ").trim().length >= 20,
                preis:         Number(e.preis),
                waehrung:      e.waehrung,
                kategorieId:   e.kategorie_id ? String(e.kategorie_id) : "",
                zustand:       e.zustand,
                bildUrl:       e.hauptbild_url,
              }}
              katOptions={katOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
