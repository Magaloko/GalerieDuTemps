import { getModuleBase } from "@/lib/module-base-server";
import Link from "next/link";
import { ChevronLeft, Zap, ImagePlus, ArrowRight } from "lucide-react";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import { produktEntwurfStartenAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Новый товар" };

/* ──────────────────────────────────────────────────────────────────────────
 * /admin/produkte/neu — Foto-first-Einstieg.
 *
 * Statt direkt das lange Formular zu zeigen, legen wir per Klick einen
 * versteckten Draft an und springen in den vollwertigen Editor — dort sind
 * Foto-Galerie + Live-Vorschau ab der ersten Sekunde nutzbar (echte produkt_id,
 * keine „erst speichern, dann Fotos"-Hürde mehr).
 * ────────────────────────────────────────────────────────────────────────── */
export default async function NeuesProduktPage() {
  const base = await getModuleBase();
  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav
        className="text-[11px] uppercase font-medium flex items-center gap-2"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
      >
        <Link href={`${base}/produkte`} className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Товары
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Новый товар</span>
      </nav>

      <header>
        <p
          className="text-[11px] uppercase font-medium mb-1"
          style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
        >
          ✦ Добавление товара
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--color-ink)" }}>
          Новый товар
        </h1>
      </header>

      <UploadVolumeBanner />

      {/* Zwei Wege: manuell (Foto-first-Editor) oder KI-Schnell */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Manuell → Draft + voller Editor mit Galerie & Vorschau */}
        <form action={produktEntwurfStartenAction}>
          <button
            type="submit"
            className="group w-full h-full text-left p-6 transition-all hover:opacity-95"
            style={{
              background:   "var(--color-coral)",
              color:        "#fff",
              borderRadius: "var(--radius-card)",
              minHeight:    180,
            }}
          >
            <ImagePlus className="w-7 h-7 mb-3" />
            <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
              Создать вручную
            </p>
            <p className="text-sm mt-1 opacity-90">
              Сразу загрузите фото, заполните поля — справа живой предпросмотр карточки.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[11px] uppercase font-medium" style={{ letterSpacing: "0.18em" }}>
              Начать <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </form>

        {/* KI-Schnell */}
        <Link
          href={`${base}/produkte/schnell`}
          className="group p-6 transition-all hover:opacity-95"
          style={{
            background:   "#fff",
            border:       "1px solid var(--color-line)",
            borderRadius: "var(--radius-card)",
            minHeight:    180,
          }}
        >
          <Zap className="w-7 h-7 mb-3" style={{ color: "var(--color-gold, #C9A84C)" }} />
          <p className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
            Быстро (ИИ)
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>
            Фото → ИИ предложит название, описание, эпоху и теги. Вы проверяете и сохраняете.
          </p>
          <span
            className="mt-4 inline-flex items-center gap-1 text-[11px] uppercase font-medium"
            style={{ letterSpacing: "0.18em", color: "var(--color-coral)" }}
          >
            Открыть <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
