"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { formatPreis } from "@/lib/utils/preis";

type Currency = "KZT" | "EUR" | "USD" | "RUB";

interface Props {
  produktId:    string;
  slug:         string;
  name:         string;
  bildUrl:      string | null;
  preisCents:   number;
  lagerbestand: number;
  verkauft:     boolean;
  waehrung:     Currency;
}

/* ──────────────────────────────────────────────────────────────────────────
 * ProductMiniClient
 *
 * Hat KEIN sichtbares Markup. Statt eines normalen Buttons setzt sie den
 * Telegram-MainButton (großer fixierter Button am Boden des WebView, von
 * Telegram theme-konsistent gerendert) auf „В корзину – <Preis>" und
 * verbindet onClick mit dem Cart-Store.
 *
 * Beim Unmount wird MainButton wieder versteckt — wichtig für saubere
 * Navigation zwischen Pages.
 *
 * Visueller Preis steht in der Server-Komponente schon im Header — der
 * MainButton wiederholt nur den Preis als Bestätigung.
 * ────────────────────────────────────────────────────────────────────────── */
export function ProductMiniClient({
  produktId, slug, name, bildUrl, preisCents, lagerbestand, verkauft, waehrung,
}: Props) {
  const hinzufuegen = useCart(s => s.hinzufuegen);
  const router      = useRouter();
  const triggered   = useRef(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const main = tg.MainButton;
    if (verkauft || lagerbestand <= 0) {
      main.setText("Нет в наличии");
      main.show();
      return () => main.hide();
    }

    const preisText = formatPreis(preisCents / 100, waehrung);
    main.setText(`В корзину · ${preisText}`);
    main.show();

    const onClick = () => {
      if (triggered.current) return;
      triggered.current = true;
      hinzufuegen({
        produkt_id:        produktId,
        slug,
        name,
        bild_url:          bildUrl,
        einzelpreis_cents: preisCents,
        tax_rate:          12,
        tax_exempt:        false,
        ist_seminar:       false,
        max_menge:         lagerbestand,
      });
      // Quick-feedback via Telegram HapticFeedback wenn verfügbar
      const haptic = (tg as unknown as { HapticFeedback?: { notificationOccurred: (s: string) => void } }).HapticFeedback;
      try { haptic?.notificationOccurred("success"); } catch {}
      router.push("/tg/cart");
    };
    main.onClick(onClick);

    return () => {
      main.hide();
    };
  }, [produktId, slug, name, bildUrl, preisCents, lagerbestand, verkauft, waehrung, hinzufuegen, router]);

  return null;
}
