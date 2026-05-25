"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, RotateCcw, Check } from "lucide-react";
import {
  QUIZ_FRAGEN,
  QUIZ_RESULTS,
  berechneArchetyp,
  type Antwort,
  type Archetyp,
} from "@/lib/quiz/fragen";

type Phase = "intro" | "fragen" | "ergebnis";

export function QuizClient() {
  const [phase, setPhase]           = useState<Phase>("intro");
  const [aktiveFrage, setAktiveFrage] = useState(0);
  const [antworten, setAntworten]   = useState<Antwort[]>([]);

  const reset = () => {
    setPhase("intro");
    setAktiveFrage(0);
    setAntworten([]);
  };

  const start = () => {
    setPhase("fragen");
    setAktiveFrage(0);
    setAntworten([]);
  };

  const waehleAntwort = (a: Antwort) => {
    const neu = [...antworten, a];
    setAntworten(neu);

    if (aktiveFrage < QUIZ_FRAGEN.length - 1) {
      setAktiveFrage(aktiveFrage + 1);
    } else {
      setPhase("ergebnis");
    }
  };

  // ─── INTRO ────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center">
        <div
          className="inline-flex items-center justify-center w-16 h-16 mb-8 border border-vintage-gold/40"
          style={{ borderRadius: "50%", boxShadow: "var(--shadow-gold-glow)" }}
        >
          <Sparkles className="w-6 h-6 text-vintage-gold" />
        </div>
        <p className="eyebrow mb-6">Персональный тест</p>
        <h1 className="font-serif text-4xl md:text-5xl text-vintage-white mb-2">
          Какой у вас
        </h1>
        <p className="font-serif text-4xl md:text-5xl italic text-vintage-gold mb-2">
          винтажный
        </p>
        <h1 className="font-serif text-4xl md:text-5xl text-vintage-white mb-10">
          характер?
        </h1>
        <p className="text-vintage-cream/70 text-base font-sans max-w-md mx-auto mb-10 leading-relaxed">
          5 вопросов · 1 минута · ваш уникальный профиль и подборка вещей специально для вас
        </p>
        <button
          onClick={start}
          className="
            inline-flex items-center gap-2
            px-10 py-4
            bg-vintage-gold text-vintage-espresso
            font-sans text-xs tracking-[0.25em] uppercase
            hover:bg-vintage-amber transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          Начать тест <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ─── FRAGEN ───────────────────────────────────────────────────────────
  if (phase === "fragen") {
    const frage = QUIZ_FRAGEN[aktiveFrage];
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">{frage.eyebrow}</p>
            <p className="text-vintage-dust text-xs font-sans tracking-widest">
              {aktiveFrage + 1} / {QUIZ_FRAGEN.length}
            </p>
          </div>
          <div className="h-px bg-vintage-sand/30 relative">
            <div
              className="absolute top-0 left-0 h-full bg-vintage-gold transition-all duration-500"
              style={{ width: `${((aktiveFrage + 1) / QUIZ_FRAGEN.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Frage */}
        <h2 className="font-serif italic text-3xl md:text-4xl text-vintage-white text-center mb-12 leading-tight">
          {frage.titel}
        </h2>

        {/* Antworten */}
        <div className="grid gap-3">
          {frage.antworten.map((a, i) => (
            <button
              key={i}
              onClick={() => waehleAntwort(a)}
              className="
                group flex items-center justify-between gap-4
                w-full text-left
                px-6 py-5
                bg-vintage-brown/60 border border-vintage-sand/30
                hover:border-vintage-gold hover:bg-vintage-brown
                transition-all
              "
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <span className="font-serif text-vintage-cream text-base group-hover:text-vintage-gold transition-colors">
                {a.text}
              </span>
              <ArrowRight className="w-4 h-4 text-vintage-sand group-hover:text-vintage-gold group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="mt-12 text-center">
          <button
            onClick={reset}
            className="text-vintage-dust text-xs font-sans tracking-widest uppercase hover:text-vintage-gold transition-colors"
          >
            ← Начать заново
          </button>
        </div>
      </div>
    );
  }

  // ─── ERGEBNIS ─────────────────────────────────────────────────────────
  const { archetyp, sortiert } = berechneArchetyp(antworten);
  const result = QUIZ_RESULTS[archetyp];

  // Tags aus Antworten + Archetyp-Empfehlungen sammeln
  const alleTags = new Set<string>(result.empfohlene_tags);
  for (const a of antworten) {
    a.tags?.forEach(t => alleTags.add(t));
  }
  const tagList = Array.from(alleTags).slice(0, 8);
  const suchQuery = tagList.slice(0, 3).join(" ");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      {/* Crown / Sparkle */}
      <div
        className="inline-flex items-center justify-center w-20 h-20 mb-8 border-2 border-vintage-gold"
        style={{ borderRadius: "50%", boxShadow: "var(--shadow-gold-glow)" }}
      >
        <Sparkles className="w-8 h-8 text-vintage-gold" />
      </div>

      <p className="eyebrow mb-4">Ваш винтажный характер</p>
      <h1 className="font-serif italic text-5xl md:text-6xl text-vintage-gold mb-4">
        {result.titel}
      </h1>
      <p className="font-serif italic text-vintage-cream/70 text-lg mb-10">
        {result.zitat}
      </p>

      <div className="divider-ornament max-w-xs mx-auto mb-10">
        <span className="text-vintage-gold text-base">◆</span>
      </div>

      <p className="text-vintage-cream/80 font-sans text-base leading-relaxed mb-12 max-w-lg mx-auto">
        {result.beschreibung}
      </p>

      {/* Tags */}
      <div className="mb-10">
        <p className="eyebrow mb-4">Подборка для вас</p>
        <div className="flex flex-wrap justify-center gap-2">
          {tagList.map(tag => (
            <span
              key={tag}
              className="px-4 py-1.5 border border-vintage-gold/40 text-vintage-gold text-xs font-serif italic"
              style={{ borderRadius: "999px" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Score-Breakdown (klein, dezent) */}
      <details className="mb-10 inline-block text-left">
        <summary className="cursor-pointer text-xs font-sans tracking-widest uppercase text-vintage-dust hover:text-vintage-gold transition-colors">
          ◇ Развернуть ваш профиль
        </summary>
        <div className="mt-4 space-y-2">
          {sortiert.map(([typ, score]) => (
            <div key={typ} className="flex items-center gap-3 text-sm font-sans">
              <span className="text-vintage-cream/80 w-28">{QUIZ_RESULTS[typ].titel}</span>
              <div className="flex-1 h-1 bg-vintage-sand/20" style={{ width: 120 }}>
                <div
                  className="h-full bg-vintage-gold"
                  style={{ width: `${(score / 10) * 100}%` }}
                />
              </div>
              <span className="text-vintage-gold text-xs font-mono w-6 text-right">{score}</span>
            </div>
          ))}
        </div>
      </details>

      {/* CTAs */}
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href={`/katalog?suche=${encodeURIComponent(suchQuery)}`}
          className="
            inline-flex items-center gap-2
            px-8 py-3.5
            bg-vintage-gold text-vintage-espresso
            font-sans text-xs tracking-[0.25em] uppercase
            hover:bg-vintage-amber transition-colors
          "
          style={{ borderRadius: "var(--radius-button)" }}
        >
          <Check className="w-3.5 h-3.5" /> Смотреть подборку
        </Link>
        <button
          onClick={reset}
          className="
            inline-flex items-center gap-2
            px-6 py-3.5
            text-vintage-cream/50 hover:text-vintage-gold
            font-sans text-xs tracking-[0.25em] uppercase
            transition-colors
          "
        >
          <RotateCcw className="w-3.5 h-3.5" /> Пройти заново
        </button>
      </div>
    </div>
  );
}
