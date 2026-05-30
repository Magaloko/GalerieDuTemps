import { getModuleBase } from "@/lib/module-base-server";
import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { brandsAktiv } from "@/lib/db/brands";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { ProduktFormular } from "@/components/produkte/produkt-formular";
import { KiFuellenBlock } from "@/components/produkte/ki-fuellen-block";
import { QrWidget } from "@/components/produkte/qr-widget";
import { KundenPushButton } from "@/components/produkte/kunden-push-button";
import {
  produktAktualisierenAction,
  produktLoeschenAction,
  produktDuplizierenAction,
} from "../actions";
import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, ExternalLink, Copy, CheckCircle2, XCircle, EyeOff } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }  = await params;
  const produkt = await produktById(id);
  return { title: produkt ? `Редактировать: ${produkt.name}` : "Товар не найден" };
}

export default async function ProduktBearbeitenPage({ params }: Props) {
  const base = await getModuleBase();
  const { id } = await params;
  const [produkt, kategorien, bilder, brands] = await Promise.all([
    produktById(id),
    alleKategorien(),
    bilderFuerProdukt(id),
    brandsAktiv().catch(() => []),
  ]);

  if (!produkt) notFound();

  const updateAction    = produktAktualisierenAction.bind(null, id);
  const deleteAction    = produktLoeschenAction.bind(null, id);
  const duplicateAction = produktDuplizierenAction.bind(null, id);

  // Status-Badge-Logik (helle App-Tokens: ruhige Chips auf Paper)
  const statusBadge = (() => {
    const muted   = { bg: "rgba(122,125,146,0.12)", fg: "var(--color-ink-mute)" };
    const danger  = { bg: "rgba(194,71,71,0.12)",   fg: "var(--color-vintage-burgundy)" };
    const coral   = { bg: "rgba(232,112,58,0.12)",  fg: "var(--color-coral-deep)" };
    const success = { bg: "rgba(74,138,110,0.15)",  fg: "var(--color-vintage-forest)" };
    if (!produkt.aktiv)                      return { label: "Неактивен",     icon: XCircle,      tone: muted };
    if (produkt.verkauft)                    return { label: "Продано",       icon: XCircle,      tone: danger };
    if (produkt.lagerbestand === 0)          return { label: "Нет в наличии", icon: XCircle,      tone: coral };
    if (produkt.b2c_mode === "hidden")       return { label: "Скрыт",         icon: EyeOff,       tone: muted };
    if (produkt.b2c_mode === "teaser")       return { label: "Витрина",       icon: EyeOff,       tone: coral };
    return                                            { label: "Активен",      icon: CheckCircle2, tone: success };
  })();

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 max-w-6xl">
      {/* ─── Haupt-Spalte ─────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-sans text-[var(--color-ink-mute)]">
            <Link href={`${base}/produkte`} className="hover:text-[var(--color-ink)] transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Товары
            </Link>
            <span>/</span>
            <span className="text-[var(--color-ink)] truncate max-w-48">{produkt.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/katalog/${produkt.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border text-xs font-sans uppercase tracking-widest transition-colors border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-ink)]"
              style={{ borderRadius: "var(--radius-app)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> В магазине
            </a>
            <form action={duplicateAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 border text-xs font-sans uppercase tracking-widest transition-colors border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-ink)]"
                style={{ borderRadius: "var(--radius-app)" }}
              >
                <Copy className="w-3.5 h-3.5" /> Дублировать
              </button>
            </form>
            <Link
              href={`${base}/produkte/${id}/bilder`}
              className="flex items-center gap-2 px-4 py-2 border text-xs font-sans uppercase tracking-widest transition-colors border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-ink)]"
              style={{ borderRadius: "var(--radius-app)" }}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Фото
            </Link>
            {produkt.aktiv && !produkt.verkauft && <KundenPushButton id={produkt.id} />}
          </div>
        </div>

        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-xs tracking-widest" style={{ color: "var(--color-coral)" }}>✦</p>
          <h1 className="font-serif text-2xl" style={{ color: "var(--color-ink)" }}>{produkt.name}</h1>
          <span
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-sans"
            style={{ borderRadius: "var(--radius-app)", background: statusBadge.tone.bg, color: statusBadge.tone.fg }}
          >
            <statusBadge.icon className="w-3 h-3" /> {statusBadge.label}
          </span>
        </div>
        <p className="text-xs font-sans -mt-3" style={{ color: "var(--color-ink-mute)" }}>
          ID: {produkt.id} · Slug: {produkt.slug}
          {produkt.artikel_code && ` · Артикул: ${produkt.artikel_code}`}
        </p>

        <KiFuellenBlock produktId={produkt.id} />

        <ProduktFormular
          produkt={produkt}
          kategorien={kategorien}
          brands={brands}
          initialBilder={bilder}
          action={updateAction}
          loeschenAction={deleteAction}
        />
      </div>

      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <QrWidget slug={produkt.slug} />
      </aside>
    </div>
  );
}
