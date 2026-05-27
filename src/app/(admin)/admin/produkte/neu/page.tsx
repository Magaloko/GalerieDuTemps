import { alleKategorien } from "@/lib/db/kategorien";
import { ProduktFormular } from "@/components/produkte/produkt-formular";
import { UploadVolumeBanner } from "@/components/produkte/upload-volume-banner";
import { produktErstellenAction } from "../actions";
import Link from "next/link";
import { ChevronLeft, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Neues Produkt" };

export default async function NeuesProduktPage() {
  const kategorien = await alleKategorien();

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav
        className="text-[11px] uppercase font-medium flex items-center gap-2"
        style={{ letterSpacing: "0.18em", color: "var(--color-ink-mute)" }}
      >
        <Link href="/admin/produkte" className="hover:text-coral transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3 h-3" /> Produkte
        </Link>
        <span>/</span>
        <span style={{ color: "var(--color-ink)" }}>Neues Produkt</span>
      </nav>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p
            className="text-[11px] uppercase font-medium mb-1"
            style={{ letterSpacing: "0.28em", color: "var(--color-coral)" }}
          >
            ✦ Produktanlage
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize:   28,
              color:      "var(--color-ink)",
            }}
          >
            Neues Produkt
          </h1>
        </div>
        <Link
          href="/admin/produkte/schnell"
          className="inline-flex items-center gap-2 text-[11px] uppercase font-medium px-3 py-2 hover:opacity-80"
          style={{
            letterSpacing: "0.22em",
            background:    "var(--color-coral)",
            color:         "#fff",
            border:        "1px solid var(--color-coral)",
          }}
        >
          <Zap className="w-3 h-3" /> Schnell-Modus (KI)
        </Link>
      </header>

      <UploadVolumeBanner />

      <ProduktFormular
        kategorien={kategorien}
        action={produktErstellenAction}
      />
    </div>
  );
}
