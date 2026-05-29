import { notFound } from "next/navigation";
import { produktById } from "@/lib/db/produkte";
import { alleKategorien } from "@/lib/db/kategorien";
import { bilderFuerProdukt } from "@/lib/db/bilder";
import { ProduktFormular } from "@/components/produkte/produkt-formular";
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
  const { id } = await params;
  const [produkt, kategorien, bilder] = await Promise.all([
    produktById(id),
    alleKategorien(),
    bilderFuerProdukt(id),
  ]);

  if (!produkt) notFound();

  const updateAction    = produktAktualisierenAction.bind(null, id);
  const deleteAction    = produktLoeschenAction.bind(null, id);
  const duplicateAction = produktDuplizierenAction.bind(null, id);

  // Status-Badge-Logik
  const statusBadge = (() => {
    if (!produkt.aktiv)                      return { label: "Неактивен",     icon: XCircle,   klasse: "bg-vintage-dust/20 text-vintage-dust" };
    if (produkt.verkauft)                    return { label: "Продано",       icon: XCircle,   klasse: "bg-vintage-burgundy/10 text-vintage-burgundy" };
    if (produkt.lagerbestand === 0)          return { label: "Нет в наличии", icon: XCircle,   klasse: "bg-vintage-copper/10 text-vintage-copper" };
    if (produkt.b2c_mode === "hidden")       return { label: "Скрыт",         icon: EyeOff,    klasse: "bg-vintage-dust/20 text-vintage-dust" };
    if (produkt.b2c_mode === "teaser")       return { label: "Витрина",       icon: EyeOff,    klasse: "bg-vintage-gold/10 text-vintage-gold" };
    return                                            { label: "Активен",      icon: CheckCircle2, klasse: "bg-vintage-sage/10 text-vintage-sage" };
  })();

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6 max-w-6xl">
      {/* ─── Haupt-Spalte ─────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-sans text-vintage-dust">
            <Link href="/admin/produkte" className="hover:text-vintage-brown transition-colors flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" /> Товары
            </Link>
            <span>/</span>
            <span className="text-vintage-ink truncate max-w-48">{produkt.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/katalog/${produkt.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> В магазине
            </a>
            <form action={duplicateAction}>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Copy className="w-3.5 h-3.5" /> Дублировать
              </button>
            </form>
            <Link
              href={`/admin/produkte/${id}/bilder`}
              className="flex items-center gap-2 px-4 py-2 border border-vintage-sand text-vintage-brown text-xs font-sans uppercase tracking-widest hover:bg-vintage-parchment transition-colors"
              style={{ borderRadius: "var(--radius-button)" }}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Фото
            </Link>
            {produkt.aktiv && !produkt.verkauft && <KundenPushButton id={produkt.id} />}
          </div>
        </div>

        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-vintage-gold text-xs tracking-widest">✦</p>
          <h1 className="font-serif text-2xl text-vintage-espresso">{produkt.name}</h1>
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-sans ${statusBadge.klasse}`}
            style={{ borderRadius: "var(--radius-vintage)" }}
          >
            <statusBadge.icon className="w-3 h-3" /> {statusBadge.label}
          </span>
        </div>
        <p className="text-vintage-dust text-xs font-sans -mt-3">
          ID: {produkt.id} · Slug: {produkt.slug}
          {produkt.artikel_code && ` · Артикул: ${produkt.artikel_code}`}
        </p>

        <ProduktFormular
          produkt={produkt}
          kategorien={kategorien}
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
