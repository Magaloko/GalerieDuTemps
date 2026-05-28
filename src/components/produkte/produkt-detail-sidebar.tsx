"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart, Share2, Check, Truck, MessageCircle, Send, Mail,
  Phone, QrCode, X, Copy,
} from "lucide-react";
import { useWunschliste } from "@/hooks/use-wunschliste";
import { formatPreis, rabattProzent } from "@/lib/utils/preis";
import { AddToCartButton } from "./add-to-cart-button";
import { InstagramIcon } from "./instagram-icon";

interface Props {
  produkt: {
    id:             string;
    slug:           string;
    name:           string;
    preis:          number;
    originalpreis:  number | null;
    waehrung:       "KZT" | "EUR" | "USD" | "RUB";
    verkauft:       boolean;
    lagerbestand:   number;
    hauptbildUrl:   string | null;
    b2c_mode?:      "visible" | "teaser" | "hidden";
  };
  kontakt: {
    whatsappUrl:  string | null;
    telegramUrl:  string | null;
    instagramUrl: string | null;
    email:        string | null;
    telefon:      string | null;
  };
  /** Versand-Info als Free-Text (z.B. „Доставка по СНГ от ₸2000") */
  versandHinweis?: string | null;
  /** Kaspi-Setup für KZ — wenn vorhanden, Block mit Kaspi-Pay-Link */
  kaspi?: {
    aktiv: boolean;
    link?: string | null;
  };
  /** Wenn false: Schaufenster-Modus — kein Warenkorb/Kauf, nur Anfrage,
   *  Verfügbarkeit als „есть/нет" ohne Stückzahl. Default true. */
  kaufenAktiv?: boolean;
  /** Page-URL für QR-Code (full URL — wird im Client gelesen via window.location.href) */
}

/* ──────────────────────────────────────────────────────────────────────────
 * ProduktDetailSidebar — Sticky-Verkaufs-Karte für Produkt-Detail-Page
 *
 * Layout (top → bottom):
 *  1. Preis (gross) + Favorit/Share/Compare-Buttons
 *  2. Verfügbarkeits-Indicator (Check + "В наличии — 1 шт.")
 *  3. Versand-Info (Truck-Icon)
 *  ── Trenner ──
 *  4. Primärer CTA: WhatsApp (grün, full-width, prominent)
 *  5. Sekundär: Telegram + Mail (nebeneinander)
 *  6. Cart-Button + Kontakt-Link
 *  ── Trenner ──
 *  7. Verkäufer-Kontakte (3 Pills: WA / TG / IG)
 *  ── Trenner ──
 *  8. Kaspi-Block (wenn aktiv)
 *  ── Trenner ──
 *  9. QR-Code + Hint zum Sharen
 *
 * Sticky auf Desktop (top-24), Mobile inline.
 * ────────────────────────────────────────────────────────────────────────── */

export function ProduktDetailSidebar({ produkt, kontakt, versandHinweis, kaspi, kaufenAktiv = true }: Props) {
  const { toggle, istGemerkt } = useWunschliste();
  const gemerkt = istGemerkt(produkt.id);
  const rabatt  = produkt.originalpreis ? rabattProzent(produkt.preis, produkt.originalpreis) : 0;
  const [qrOpen, setQrOpen] = useState(false);

  const isSold       = produkt.verkauft;
  const ausverkauft  = produkt.lagerbestand === 0 && !produkt.verkauft;

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: produkt.name, url: window.location.href });
      } catch {/* User cancelled */}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {/* ignore */}
    }
  };

  return (
    <aside
      className="md:sticky md:top-24"
      style={{
        background:   "#FAFAF8",
        border:       "1px solid var(--color-line, rgba(44,36,32,0.08))",
        borderRadius: "var(--radius-card, 2px)",
        padding:      "1.5rem",
      }}
    >
      <div className="space-y-4">

        {/* ── 1. Preis + Icons ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={isSold ? "line-through" : ""}
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "clamp(1.875rem, 4vw, 2.5rem)",
                color:      isSold ? "var(--color-ink-mute, rgba(44,36,32,0.3))" : "var(--color-ink, #0C0A08)",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {formatPreis(produkt.preis, produkt.waehrung)}
            </p>
            {produkt.originalpreis && !isSold && (
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="line-through text-sm"
                  style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }}
                >
                  {formatPreis(produkt.originalpreis, produkt.waehrung)}
                </span>
                {rabatt > 0 && (
                  <span
                    className="px-1.5 py-0.5 text-[10px] uppercase font-medium"
                    style={{
                      background:    "var(--color-coral)",
                      color:         "#fff",
                      letterSpacing: "0.18em",
                    }}
                  >
                    −{rabatt}%
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton
              onClick={() => toggle(produkt.id)}
              label={gemerkt ? "Убрать из избранного" : "Добавить в избранное"}
              active={gemerkt}
            >
              <Heart
                className="w-3.5 h-3.5"
                style={{
                  color: gemerkt ? "var(--color-coral)" : "var(--color-ink-mute)",
                  fill:  gemerkt ? "var(--color-coral)" : "none",
                }}
              />
            </IconButton>
            <IconButton onClick={handleShare} label="Поделиться">
              <Share2 className="w-3.5 h-3.5" style={{ color: "var(--color-ink-mute)" }} />
            </IconButton>
          </div>
        </div>

        {/* Status-Label */}
        {isSold && (
          <p className="font-body text-xs tracking-[0.2em] uppercase" style={{ color: "var(--color-gold, #B08D57)" }}>
            Продано
          </p>
        )}
        {ausverkauft && (
          <p className="font-body text-xs tracking-[0.2em] uppercase" style={{ color: "var(--color-coral)" }}>
            Нет в наличии
          </p>
        )}

        {/* ── 2. Verfügbarkeit ──────────────────────────────────── */}
        {produkt.lagerbestand > 0 && !isSold && (
          <div className="flex items-center gap-1.5">
            <Check size={13} style={{ color: "#7A8B6F" }} />
            <span className="font-body text-xs" style={{ color: "#7A8B6F" }}>
              {/* Schaufenster-Modus: nur „В наличии" ohne Stückzahl */}
              В наличии{kaufenAktiv && produkt.lagerbestand > 1 ? ` — ${produkt.lagerbestand} шт.` : ""}
            </span>
          </div>
        )}

        {/* ── 3. Versand-Info ───────────────────────────────────── */}
        {versandHinweis && (
          <div className="flex items-center gap-1.5">
            <Truck size={13} style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.3))" }} />
            <span className="font-body text-xs" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.5))" }}>
              {versandHinweis}
            </span>
          </div>
        )}

        <Divider />

        {/* ── 4. Primary CTA: WhatsApp + Cart ─────────────────── */}
        {!isSold && (
          <div className="space-y-2.5">
            {kontakt.whatsappUrl && (
              <a
                href={kontakt.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 font-body text-sm font-medium uppercase transition-all duration-200 hover:opacity-90"
                style={{
                  background:    "#25D366",
                  color:         "#fff",
                  letterSpacing: "0.1em",
                }}
              >
                <MessageCircle size={16} />
                Написать в WhatsApp
              </a>
            )}

            <div className="flex gap-2">
              {kontakt.telegramUrl && (
                <a
                  href={kontakt.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 font-body text-sm transition-opacity hover:opacity-90"
                  style={{ background: "#26A3EE", color: "#fff" }}
                >
                  <Send size={14} />
                  Telegram
                </a>
              )}
              <Link
                href={`/kontakt?produkt=${produkt.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 font-body text-sm transition-opacity hover:opacity-90"
                style={{ background: "var(--color-ink, #2C2420)", color: "var(--color-paper, #F5F0E8)" }}
              >
                <Mail size={14} />
                Написать
              </Link>
            </div>

            {kontakt.telefon && (
              <a
                href={`tel:${kontakt.telefon.replace(/\D/g, "")}`}
                className="flex items-center justify-center gap-2 w-full py-2 font-body text-xs transition-colors hover:text-vintage-ink"
                style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }}
              >
                <Phone size={12} />
                {kontakt.telefon}
              </a>
            )}

            {/* Cart-Button — NUR im Shop-Modus (kaufenAktiv) und wenn lager > 0.
                Im Schaufenster-Modus bleiben oben die WhatsApp/Telegram/Mail-
                Anfrage-Buttons als „Запросить" der einzige Weg. */}
            {kaufenAktiv && produkt.lagerbestand > 0 && produkt.b2c_mode !== "teaser" && (
              <>
                <Divider />
                <AddToCartButton
                  produktId={produkt.id}
                  slug={produkt.slug}
                  name={produkt.name}
                  bildUrl={produkt.hauptbildUrl}
                  preisCents={Math.round(produkt.preis * 100)}
                  taxRate={12}
                  lagerbestand={produkt.lagerbestand}
                  verkauft={produkt.verkauft}
                />
              </>
            )}
          </div>
        )}

        {/* ── 5. Kaspi (KZ-spezifisch) — nur Shop-Modus ────────── */}
        {kaufenAktiv && kaspi?.aktiv && kaspi.link && !isSold && (
          <>
            <Divider />
            <div>
              <p
                className="font-body text-[10px] mb-2.5 uppercase"
                style={{
                  letterSpacing: "0.2em",
                  color:         "var(--color-ink-mute, rgba(44,36,32,0.3))",
                }}
              >
                Способы оплаты
              </p>
              <a
                href={kaspi.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 w-full px-3 py-2.5 transition-all duration-200"
                style={{
                  background:   "rgba(240, 68, 56, 0.06)",
                  border:       "1px solid rgba(240, 68, 56, 0.2)",
                  borderRadius: "var(--radius-vintage, 2px)",
                }}
              >
                <div
                  className="w-7 h-7 flex items-center justify-center shrink-0"
                  style={{ background: "#F04438", borderRadius: "2px" }}
                >
                  <span
                    className="font-display text-[12px] font-bold text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    K
                  </span>
                </div>
                <div className="text-left">
                  <p className="font-body text-sm font-medium" style={{ color: "var(--color-ink, #2C2420)" }}>
                    Kaspi.kz
                  </p>
                  <p className="font-body text-[10px]" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.4))" }}>
                    Перевод через Kaspi
                  </p>
                </div>
              </a>
            </div>
          </>
        )}

        {/* ── 6. QR-Code ───────────────────────────────────────── */}
        <Divider />
        <button
          onClick={() => setQrOpen(true)}
          className="flex items-center gap-3 w-full text-left transition-opacity hover:opacity-80"
          aria-label="QR-Code для шаринга"
        >
          <div
            className="w-12 h-12 flex items-center justify-center shrink-0"
            style={{
              border:       "1px solid var(--color-line, rgba(44,36,32,0.15))",
              background:   "#fff",
              borderRadius: "2px",
            }}
          >
            <QrCode size={22} style={{ color: "var(--color-ink, #2C2420)" }} />
          </div>
          <div>
            <p className="font-body text-xs" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.5))" }}>
              QR-код товара
            </p>
            <p className="font-body text-[10px]" style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.3))" }}>
              Нажмите для увеличения
            </p>
          </div>
        </button>
      </div>

      {/* QR-Modal */}
      {qrOpen && <QRModal onClose={() => setQrOpen(false)} />}
    </aside>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────────── */

function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{ background: "var(--color-line, rgba(44,36,32,0.08))" }}
    />
  );
}

function IconButton({
  onClick, label, active, children,
}: {
  onClick:  () => void;
  label:    string;
  active?:  boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-8 h-8 flex items-center justify-center transition-colors hover:bg-vintage-sand/40"
      style={{
        background:    active ? "rgba(232,112,58,0.10)" : "rgba(44, 36, 32, 0.06)",
        borderRadius:  "999px",
      }}
    >
      {children}
    </button>
  );
}

function QRModal({ onClose }: { onClose: () => void }) {
  // URL OHNE Query-String + Hash bauen — sonst landen utm_source, auth_token
  // oder Affiliate-Refs (vm_ref-Cookie kann nachträglich URL-Param werden)
  // im geteilten QR-Code (Privacy-Leak via Sharing).
  const url = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname
    : "";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&color=2C2420&bgcolor=FAFAF8`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "rgba(15, 20, 48, 0.85)" }}
      onClick={onClose}
    >
      <div
        className="p-6 max-w-sm w-full mx-4"
        style={{ background: "#FAFAF8", borderRadius: "2px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1 text-vintage-ink-mute hover:text-vintage-ink transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt="QR-код товара"
          className="mx-auto"
          style={{ width: 280, height: 280 }}
        />
        <p
          className="text-center font-body text-xs mt-4"
          style={{ color: "var(--color-ink-mute, rgba(44,36,32,0.5))" }}
        >
          Отсканируйте для открытия страницы товара
        </p>
        <button
          onClick={async () => {
            try { await navigator.clipboard.writeText(url); } catch {}
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 font-body text-[11px] uppercase"
          style={{
            letterSpacing: "0.18em",
            background:    "rgba(44,36,32,0.06)",
            color:         "var(--color-ink, #2C2420)",
          }}
        >
          <Copy size={11} />
          Скопировать ссылку
        </button>
      </div>
    </div>
  );
}

// Mute lint warning: InstagramIcon imported but only used conditionally if we add IG-Kontakt
void InstagramIcon;
