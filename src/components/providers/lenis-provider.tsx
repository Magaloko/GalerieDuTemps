"use client";

/**
 * LenisProvider · Smooth-Scroll für die Public-Seiten.
 *
 * Initialisiert Lenis client-seitig und koppelt es an GSAP-ScrollTrigger,
 * damit Scroll-getriggerte Animationen vom Lenis-Scroll-Wert getrieben
 * werden (nicht vom Native-Scroll, der unter Lenis "still" steht).
 *
 * Wichtig für React 19 / Next 16:
 *  - StrictMode-Doppel-Mount: useRef-Guard verhindert doppelte Lenis-
 *    Instanzen + doppelte rAF-Loops.
 *  - GSAP-Plugins werden NUR im Browser registriert (kein SSR-Import-Crash).
 *  - usePathname() löst pro Route-Change einen scrollTo(0, immediate)
 *    aus — Next-App-Router macht keinen echten Page-Reload, also würde
 *    Lenis sonst die alte Scroll-Position behalten.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Plugin-Registrierung idempotent — gsap dedupliziert intern.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Reduced-Motion respektieren — kein Smooth-Scroll, einfach Native.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration:        1.1,
      easing:          (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:     true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    // Lenis-Scroll → ScrollTrigger.update — ohne das hängen pinned Sections.
    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    // GSAP-Ticker übernimmt rAF — kein eigener requestAnimationFrame-Loop nötig.
    // Vorteil: alle GSAP-Animations + Lenis laufen in EINEM Frame, kein Jitter.
    const tickerCallback = (time: number) => {
      // GSAP-Ticker liefert Sekunden, Lenis erwartet Millisekunden.
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", onScroll);
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Route-Change → Scroll-Reset. `immediate: true` skipt die Animation;
  // sonst würde der User die alte Position kurz sehen.
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    lenis.scrollTo(0, { immediate: true, force: true });
    // ScrollTrigger.refresh() — neue Page hat neue Trigger-Punkte.
    ScrollTrigger.refresh();
  }, [pathname]);

  return <>{children}</>;
}
