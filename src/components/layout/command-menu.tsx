"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingBag, Users, Inbox, Package, Plus, LayoutGrid,
  FileText, BarChart3, Ticket, Send, ArrowRight, CornerDownLeft,
} from "lucide-react";
import { useModuleBase } from "@/lib/module-base-client";
import type { SucheTreffer } from "@/app/api/admin/suche/route";

/* ──────────────────────────────────────────────────────────────────────────
 * CommandMenu — ⌘K / Ctrl+K Operator-Sprungbrett (Twenty-Signatur).
 *
 * Overlay zum Sofort-Springen: statische Aktionen + Modul-Navigation, plus
 * Live-Suche (debounced) über Bestellungen/Kunden/Leder/Produkte via
 * /api/admin/suche. Tastatur: ⌘K öffnen, ↑/↓ navigieren, Enter springen,
 * Esc schließen. Basis-bewusst (/app vs /admin) über useModuleBase.
 *
 * Kein Fremd-Paket (cmdk) — schlanke Eigenbau-Implementierung, Record-Detail-
 * Kit-Optik (.command-* Klassen in globals.css).
 * ────────────────────────────────────────────────────────────────────────── */

interface Eintrag {
  id:    string;
  titel: string;
  sub?:  string;
  href:  string;          // OHNE Basis — wird beim Springen geprefixt (außer absolute /)
  icon:  React.ElementType;
  gruppe: string;
}

const GRUPPE_LABEL: Record<string, string> = {
  aktion:        "Действия",
  navigation:    "Разделы",
  bestellungen:  "Заказы",
  kunden:        "Клиенты",
  leads:         "Лиды",
  produkte:      "Товары",
};

const GRUPPE_ICON: Record<SucheTreffer["gruppe"], React.ElementType> = {
  bestellungen: ShoppingBag,
  kunden:       Users,
  leads:        Inbox,
  produkte:     Package,
};

// Statische Aktionen + Navigation (immer sichtbar, client-filterbar).
const AKTIONEN: Omit<Eintrag, "gruppe">[] = [
  { id: "act-produkt-neu", titel: "Новый товар",   sub: "Создать карточку", href: "/produkte/neu", icon: Plus },
  { id: "act-order-neu",   titel: "Ручной заказ",  sub: "Создать заказ",    href: "/bestellungen/neu", icon: Plus },
];

const NAVIGATION: Omit<Eintrag, "gruppe">[] = [
  { id: "nav-today",        titel: "Сегодня",     href: "/",             icon: LayoutGrid },
  { id: "nav-bestellungen", titel: "Заказы",      href: "/bestellungen", icon: ShoppingBag },
  { id: "nav-kunden",       titel: "Клиенты",     href: "/kunden",       icon: Users },
  { id: "nav-leads",        titel: "Лиды",        href: "/leads",        icon: Inbox },
  { id: "nav-produkte",     titel: "Товары",      href: "/produkte",     icon: Package },
  { id: "nav-rechnungen",   titel: "Счета",       href: "/rechnungen",   icon: FileText },
  { id: "nav-statistiken",  titel: "Статистика",  href: "/statistiken",  icon: BarChart3 },
  { id: "nav-coupons",      titel: "Промокоды",   href: "/coupons",      icon: Ticket },
  { id: "nav-newsletter",   titel: "Рассылка",    href: "/newsletter",   icon: Send },
  { id: "nav-menu",         titel: "Все разделы", href: "/menu",         icon: LayoutGrid },
];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CommandMenu({ trigger = "icon" }: { trigger?: "icon" | "none" }) {
  const router = useRouter();
  const base = useModuleBase();
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const [aktiv, setAktiv] = useState(0);
  const [treffer, setTreffer] = useState<SucheTreffer[]>([]);
  const [laedt, setLaedt] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);
  const debQuery = useDebounced(query, 220);

  // ⌘K / Ctrl+K global; Esc schließt.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fokus + Reset beim Öffnen.
  useEffect(() => {
    if (open) {
      setQuery(""); setTreffer([]); setAktiv(0);
      // Body-Scroll sperren, solange offen.
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => { clearTimeout(t); document.body.style.overflow = prev; };
    }
  }, [open]);

  // Live-Suche.
  useEffect(() => {
    if (!open) return;
    const q = debQuery.trim();
    if (q.length < 2) { setTreffer([]); setLaedt(false); return; }
    let abbruch = false;
    setLaedt(true);
    fetch(`/api/admin/suche?q=${encodeURIComponent(q)}`)
      .then(r => r.ok ? r.json() : { treffer: [] })
      .then(d => { if (!abbruch) setTreffer(d.treffer ?? []); })
      .catch(() => { if (!abbruch) setTreffer([]); })
      .finally(() => { if (!abbruch) setLaedt(false); });
    return () => { abbruch = true; };
  }, [debQuery, open]);

  // Sichtbare Einträge zusammenbauen: gefilterte Aktionen/Nav + Suchtreffer.
  const ql = query.trim().toLowerCase();
  const matcht = (t: string) => !ql || t.toLowerCase().includes(ql);

  const eintraege: Eintrag[] = [
    ...AKTIONEN.filter(a => matcht(a.titel)).map(a => ({ ...a, gruppe: "aktion" })),
    ...NAVIGATION.filter(n => matcht(n.titel)).map(n => ({ ...n, gruppe: "navigation" })),
    ...treffer.map(t => ({
      id: t.id, titel: t.titel, sub: t.sub, href: t.href,
      icon: GRUPPE_ICON[t.gruppe], gruppe: t.gruppe,
    })),
  ];

  // aktiv-Index klammern, wenn sich die Liste ändert.
  useEffect(() => { setAktiv(0); }, [debQuery, treffer.length]);

  const springen = useCallback((e: Eintrag) => {
    setOpen(false);
    router.push(`${base}${e.href}`);
  }, [base, router]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAktiv(i => Math.min(i + 1, eintraege.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAktiv(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const t = eintraege[aktiv]; if (t) springen(t); }
  };

  // Aktiven Eintrag in den sichtbaren Bereich scrollen.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${aktiv}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [aktiv, open]);

  // Trigger-Button (Lupe in der Top-Bar).
  const triggerBtn = trigger === "icon" ? (
    <button
      onClick={() => setOpen(true)}
      className="command-trigger"
      aria-label="Поиск (⌘K)"
      title="Поиск — ⌘K"
    >
      <Search className="w-[18px] h-[18px]" />
    </button>
  ) : null;

  if (!open) return triggerBtn;

  // Gruppen in Reihenfolge rendern.
  const reihenfolge = ["aktion", "navigation", "bestellungen", "kunden", "leads", "produkte"];
  let laufIdx = -1;

  return (
    <>
      {triggerBtn}
      <div className="command-overlay" onClick={() => setOpen(false)}>
        <div className="command-panel" onClick={e => e.stopPropagation()} onKeyDown={onListKey}>
          {/* Suchzeile */}
          <div className="command-search">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-ink-mute)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск заказов, клиентов, товаров … или действие"
              className="command-input"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="command-kbd">ESC</kbd>
          </div>

          {/* Trefferliste */}
          <div ref={listRef} className="command-list">
            {eintraege.length === 0 ? (
              <p className="command-empty">
                {laedt ? "Поиск …" : ql.length >= 2 ? "Ничего не найдено" : "Начните вводить запрос"}
              </p>
            ) : (
              reihenfolge.map(g => {
                const items = eintraege.filter(e => e.gruppe === g);
                if (items.length === 0) return null;
                return (
                  <div key={g} className="command-group">
                    <p className="command-group-label">{GRUPPE_LABEL[g] ?? g}</p>
                    {items.map(e => {
                      laufIdx++;
                      const idx = laufIdx;
                      const Icon = e.icon;
                      const ist = idx === aktiv;
                      return (
                        <button
                          key={e.id}
                          data-idx={idx}
                          onClick={() => springen(e)}
                          onMouseMove={() => setAktiv(idx)}
                          className={`command-item${ist ? " command-item-active" : ""}`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-ink-mute)" }} />
                          <span className="command-item-text">
                            <span className="command-item-titel">{e.titel}</span>
                            {e.sub && <span className="command-item-sub">{e.sub}</span>}
                          </span>
                          {ist
                            ? <CornerDownLeft className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-coral)" }} />
                            : <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "transparent" }} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Fußzeile mit Tastatur-Hinweisen */}
          <div className="command-foot">
            <span><kbd className="command-kbd">↑</kbd><kbd className="command-kbd">↓</kbd> навигация</span>
            <span><kbd className="command-kbd">↵</kbd> открыть</span>
            <span><kbd className="command-kbd">⌘K</kbd> поиск</span>
          </div>
        </div>
      </div>
    </>
  );
}
