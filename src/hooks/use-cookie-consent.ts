"use client";

import { useState, useEffect, useCallback } from "react";

export interface CookieConsent {
  notwendig:  true;         // immer true
  affiliate:  boolean;
  analytics:  boolean;
  /** ISO-Zeitstempel der letzten Entscheidung */
  entschieden_am?: string;
  version: number;          // erhöht sich bei AGB-Änderung → erneute Abfrage
}

const STORAGE_KEY    = "vm_cookie_consent";
const CURRENT_VERSION = 1;

const DEFAULT: CookieConsent = {
  notwendig:  true,
  affiliate:  false,
  analytics:  false,
  version:    CURRENT_VERSION,
};

function laden(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    // Veraltete Version → neu fragen
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function speichern(consent: CookieConsent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));

  // Server-lesbarer Marker-Cookie (non-HttpOnly): wird vom Proxy / /r/[code]
  // gelesen, um zu prüfen, ob Affiliate-Tracking erlaubt ist.
  const maxAge = 365 * 24 * 60 * 60;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `vm_consent_aff=${consent.affiliate ? "1" : "0"}; max-age=${maxAge}; path=/; SameSite=Lax${secure}`;

  // Custom-Event für andere Tabs/Components
  window.dispatchEvent(new CustomEvent("vm-cookie-consent-changed", { detail: consent }));
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Initial laden + auf Changes hören
  useEffect(() => {
    setConsent(laden());
    setHydrated(true);

    const handler = (e: Event) => {
      setConsent((e as CustomEvent<CookieConsent>).detail);
    };
    window.addEventListener("vm-cookie-consent-changed", handler);
    return () => window.removeEventListener("vm-cookie-consent-changed", handler);
  }, []);

  const akzeptiereAlle = useCallback(() => {
    const c: CookieConsent = {
      notwendig:     true,
      affiliate:     true,
      analytics:     true,
      entschieden_am: new Date().toISOString(),
      version:       CURRENT_VERSION,
    };
    speichern(c);
    setConsent(c);
  }, []);

  const akzeptiereNurNotwendig = useCallback(() => {
    const c: CookieConsent = {
      ...DEFAULT,
      entschieden_am: new Date().toISOString(),
    };
    speichern(c);
    setConsent(c);
  }, []);

  const aktualisiere = useCallback((patches: Partial<Pick<CookieConsent, "affiliate" | "analytics">>) => {
    const c: CookieConsent = {
      ...DEFAULT,
      ...consent,
      ...patches,
      entschieden_am: new Date().toISOString(),
      version:       CURRENT_VERSION,
    };
    speichern(c);
    setConsent(c);
  }, [consent]);

  const widerruf = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
    window.dispatchEvent(new CustomEvent("vm-cookie-consent-changed", { detail: null }));
  }, []);

  return {
    consent,
    hydrated,
    hatEntschieden:        !!consent?.entschieden_am,
    affiliateErlaubt:      !!consent?.affiliate,
    analyticsErlaubt:      !!consent?.analytics,
    akzeptiereAlle,
    akzeptiereNurNotwendig,
    aktualisiere,
    widerruf,
  };
}
