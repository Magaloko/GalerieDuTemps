"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Settings, X, Check } from "lucide-react";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

export function CookieBanner() {
  const {
    consent,
    hydrated,
    hatEntschieden,
    affiliateErlaubt,
    analyticsErlaubt,
    akzeptiereAlle,
    akzeptiereNurNotwendig,
    aktualisiere,
  } = useCookieConsent();

  const [settingsOffen, setSettingsOffen] = useState(false);
  const [affiliateAn,   setAffiliateAn]   = useState(false);
  const [analyticsAn,   setAnalyticsAn]   = useState(false);

  useEffect(() => {
    if (settingsOffen) {
      setAffiliateAn(affiliateErlaubt);
      setAnalyticsAn(analyticsErlaubt);
    }
  }, [settingsOffen, affiliateErlaubt, analyticsErlaubt]);

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cookie-settings]")) {
        e.preventDefault();
        setSettingsOffen(true);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  if (!hydrated) return null;

  const zeigeBanner = !hatEntschieden && !settingsOffen;

  return (
    <>
      {/* Sticky Banner — Mobile: über der Bottom-TabBar positioniert
          (sonst überlagert er Аккаунт- und Wishlist-Tab und macht die TabBar
          komplett unklickbar). Desktop: normales bottom-0. */}
      {zeigeBanner && (
        <div
          className="fixed inset-x-0 z-50 p-4 sm:p-6"
          style={{
            // Mobile: 100px (TabBar = 12+22+12+~28 padding ≈ ~80px + safe-area).
            // Desktop: bottom-0 (keine TabBar).
            // Inline-style overridden Tailwind; mit CSS-Variable steuern wir
            // per Media-Query.
            bottom: "var(--cookie-banner-bottom, 100px)",
          }}
        >
          <style>{`
            :root { --cookie-banner-bottom: var(--public-tabbar-h); }
            @media (min-width: 768px) { :root { --cookie-banner-bottom: 0px; } }
          `}</style>
          <div
            className="max-w-4xl mx-auto bg-vintage-espresso text-vintage-cream p-5 sm:p-6 grid md:grid-cols-[1fr,auto] gap-4 items-center"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-xl)" }}
            role="dialog"
            aria-label="Согласие на использование cookie"
          >
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-vintage-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-serif text-base mb-1">Cookies и трекинг</p>
                <p className="text-vintage-cream/70 text-xs font-sans leading-relaxed">
                  Мы используем технически необходимые cookies (всегда активны), а также
                  опциональные cookies партнёрской программы. Последние помогают засчитывать
                  покупки партнёрам, которые нас рекомендовали. Подробности — в{" "}
                  <Link href="/datenschutz" className="text-vintage-gold underline">политике конфиденциальности</Link>.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
              <button
                onClick={() => setSettingsOffen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-vintage-cream/30 text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-cream/10 transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Settings className="w-3 h-3" /> Настроить
              </button>
              <button
                onClick={akzeptiereNurNotwendig}
                className="px-4 py-2.5 border border-vintage-cream/30 text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-cream/10 transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Только необходимые
              </button>
              <button
                onClick={akzeptiereAlle}
                className="px-5 py-2.5 bg-vintage-gold text-vintage-espresso text-xs font-sans tracking-widest uppercase hover:bg-vintage-copper transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Принять все
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings-Modal */}
      {settingsOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vintage-ink/50 backdrop-blur-sm" onClick={() => setSettingsOffen(false)} />
          <div
            className="relative bg-vintage-white border border-vintage-sand max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
            style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-vintage-xl)" }}
          >
            <button
              onClick={() => setSettingsOffen(false)}
              className="absolute top-3 right-3 p-1.5 text-vintage-dust hover:text-vintage-brown hover:bg-vintage-parchment transition-colors"
              style={{ borderRadius: "var(--radius-vintage)" }}
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <Cookie className="w-6 h-6 text-vintage-gold mb-2" />
              <h2 className="font-serif text-xl text-vintage-espresso">Настройки cookies</h2>
              <p className="text-vintage-dust text-xs font-sans mt-1">
                Выберите, какие cookies мы можем устанавливать.
              </p>
            </div>

            <Kategorie
              titel="Технически необходимые"
              beschreibung="Токен сессии (вход), защита CSRF, выбор языка. Без этих cookies сайт не работает."
              aktiv={true}
              disabled
              onChange={() => {}}
              immerAktivLabel="Всегда активно"
            />

            <Kategorie
              titel="Партнёрский трекинг"
              beschreibung="Cookie 'aff_ref' (HttpOnly, 30 дней). Позволяет начислять комиссию партнёрам, которые вас привели. Поддерживает нашу партнёрскую программу."
              aktiv={affiliateAn}
              onChange={setAffiliateAn}
            />

            <Kategorie
              titel="Аналитика (запланировано)"
              beschreibung="Анонимная статистика использования для улучшения сайта. В данный момент не используется."
              aktiv={analyticsAn}
              onChange={setAnalyticsAn}
              hinweis="Сейчас аналитические cookies не используются."
            />

            {consent?.entschieden_am && (
              <p className="text-xs text-vintage-dust font-sans mt-4 italic">
                Последний выбор: {new Date(consent.entschieden_am).toLocaleString("ru-RU")}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={() => { akzeptiereNurNotwendig(); setSettingsOffen(false); }}
                className="px-4 py-2.5 border border-vintage-sand text-vintage-brown text-xs font-sans tracking-widest uppercase hover:bg-vintage-parchment transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                Отклонить все
              </button>
              <button
                onClick={() => {
                  aktualisiere({ affiliate: affiliateAn, analytics: analyticsAn });
                  setSettingsOffen(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-vintage-espresso text-vintage-cream text-xs font-sans tracking-widest uppercase hover:bg-vintage-brown transition-colors"
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <Check className="w-3.5 h-3.5" /> Сохранить выбор
              </button>
            </div>

            <p className="text-center text-vintage-dust text-xs font-sans mt-4">
              <Link href="/datenschutz" className="text-vintage-brown hover:text-vintage-espresso underline">
                Политика конфиденциальности
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Kategorie({
  titel, beschreibung, aktiv, disabled = false, onChange, hinweis, immerAktivLabel,
}: {
  titel: string;
  beschreibung: string;
  aktiv: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  hinweis?: string;
  immerAktivLabel?: string;
}) {
  return (
    <div className="border-t border-vintage-sand py-4 first-of-type:border-t-0 first-of-type:pt-2">
      <label className="flex items-start gap-4 cursor-pointer">
        <input
          type="checkbox"
          checked={aktiv}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-vintage-gold disabled:opacity-50"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-serif text-vintage-espresso">{titel}</p>
            {disabled && immerAktivLabel && (
              <span className="text-[10px] font-sans uppercase tracking-widest px-2 py-0.5 bg-vintage-dust/20 text-vintage-dust" style={{ borderRadius: "var(--radius-vintage)" }}>
                {immerAktivLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-vintage-dust font-sans mt-1 leading-relaxed">{beschreibung}</p>
          {hinweis && <p className="text-xs text-vintage-gold font-sans mt-1 italic">{hinweis}</p>}
        </div>
      </label>
    </div>
  );
}
