# Design-Sitzung — Briefing & Prompt

> Diese Datei ist der vollständige Einstieg für eine **eigene Claude-Code-Sitzung**, die
> sich AUSSCHLIESSLICH um die **visuelle Darstellung / das UI-Design** kümmert.
> In der neuen Session genügt: „Lies `docs/DESIGN_SESSION.md` und folge ihr."

---

## Aufgabe: Visuelle Darstellung / UI-Design überarbeiten (NUR Optik)

Projekt **Galerie du Temps** — Vintage-/Antiquitäten-E-Commerce (RU-Primärsprache,
Almaty/Kasachstan). Stack: **Next.js 16.2.6 / React 19 / TypeScript / Tailwind**.
WICHTIG: Diese Next.js-Version hat Breaking Changes — vor Code die passende Anleitung in
`node_modules/next/dist/docs/` lesen (siehe AGENTS.md).

### Fokus dieser Sitzung
AUSSCHLIESSLICH **visuelle Darstellung / UI-Design** über alle Oberflächen: Look & Feel,
Layout, Typografie, Farben, Abstände, Konsistenz, Polish, Responsiveness-Feinschliff —
NICHT Geschäftslogik, Datenbank, Auth, Routing, Datenflüsse. Fällt Logisches auf:
notieren, nicht ändern.

### Die Oberflächen
1. **Öffentliche Website (Shop):** `src/app/(public)/**`, `src/app/page.tsx`,
   `src/components/{home,landing,produkte}/**`,
   `src/components/layout/{site-header,footer,mobile-tab-bar,mobile-drawer}.tsx`
2. **Operator-App (`/app`, mobile-first, Default):** `src/app/app/**`
   (`(today)` = Сегодня/Меню schmal, `(modules)` = alle Module fluid), `app-shell.tsx`
3. **Klassik-Admin (`/admin`):** `src/app/(admin)/admin/**`,
   `components/layout/admin-sidebar.tsx`
4. **Telegram-Mini-App (`/tg`):** `src/app/(telegram)/**`, `tg/tab-bar.tsx`,
   `telegram-chrome.tsx` (hell/dunkel via `[data-tg-theme]`)
5. **Kunden-Bereich:** `src/app/kunde/**` · **Affiliate:** `src/app/affiliate/**`

### Design-System / wo die Optik herkommt
- **Tokens & Basis-Styles:** `src/app/globals.css` (`:root` — cobalt/coral/paper/ink/line,
  Fonts, Tab-Bar-Höhen `--public-tabbar-h`/`--tg-tabbar-h`, Dark-Mode-Overrides, Utilities
  `.btn-coral`/`.wordmark`/`.eyebrow`).
- **Fonts (`src/app/layout.tsx`):** Playfair, Italiana (Wordmark), Cormorant
  (Display/Italic), Inter, Source Sans (Body), JetBrains (mono).
- **Live-editierbares Theme:** Farben/Branding in `/app/einstellungen/design`
  (DB-Override via `src/lib/db/theme.ts` → `renderThemeCssVars`). → Tokens nutzen, NICHT
  Farben hart kodieren.
- **Vorlage:** `design_handoff_galerie_du_temps/README.md` (Cobalt+Coral).
- Marken-Look Shop: Vintage/editorial, Serifen-Display + viel Letter-Spacing, Coral-CTAs,
  Paper-Hintergründe, kein/wenig Radius.

### Design-Referenz: Twenty CRM (github.com/twentyhq/twenty)
Nordstern für die **datenlastigen Operator-/CRM-Flächen** (`/app`-Module + `/admin`):
ruhige, dichte Tabellen mit Inline-Edit & leisen Hover-States; Record-Detail-Layout
(Stammdaten links + Timeline/Activity rechts); kompakte Kanban-Karten; optional ein
Command-Menu (⌘K); disziplinierte Tokens (wenige Graustufen, EIN Akzent, viel Weißraum,
kleine Radii, dezente Borders).
WICHTIG: NUR **Patterns/Prinzipien** übernehmen, KEIN Code — Twenty nutzt Linaria
(CSS-in-JS) + Jotai, wir Tailwind + CSS-Tokens. Twenty ist NICHT die Referenz für den
**öffentlichen Shop** — der bleibt boutique/editorial/vintage, nicht SaaS-nüchtern.

### Bereits erledigt (NICHT erneut anfassen, nur respektieren)
- Responsiveness Welle 1+2 (viewport-fit=cover, Safe-Area, `dvh`, Tab-Bar-Höhen-Vars,
  Telegram Dark-Mode, Bottom-Bar-Overlaps).
- Komplette `/app`-Routen-Migration (alle 21 Module unter echten `/app/*`-URLs; `/admin`
  = Klassik). Routing/Basis-Logik ist fertig — hier nur Optik.
- Block-/Typografie-System (Größe S/M/L/XL + Schriftart) für Journal/Pages/Newsletter.

### Arbeitsweise (Projekt-Konvention)
- **Verifizieren vor „fertig":** `npx tsc --noEmit`, `npx vitest run`, `npx next build` grün.
- **Visuell prüfen:** `npm run dev` + Browser/Preview-MCP (oder `/run`-/`verify`-Skill), um
  Änderungen wirklich zu SEHEN. Je Gerät prüfen: Desktop, iPad (768–1024),
  Handy (320/390/430), Telegram-WebView hell+dunkel.
- **Auto-Commit+Push:** Bei fertiger & verifizierter Aufgabe selbst committen + nach `main`
  pushen (= Coolify-Deploy), ohne Nachfrage. Semantische Commits auf Deutsch
  (`feat()/fix()/design()/refactor()`), Body Stichpunkte, Ende:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Nicht `.codex/`/Stray-Files
  mitcommitten — gezielt `git add`.
- RU = Primärsprache der UI-Texte; deutsche Code-Kommentare ok.

### Erster Schritt
KEINE Sofort-Änderungen. Überblick über die 5 Oberflächen + `globals.css` verschaffen,
Twenty als Referenz ansehen, dann eine **priorisierte Liste konkreter
Darstellungs-Verbesserungen** liefern (pro Oberfläche, mit Aufwand/Wirkung, und wo
Twenty-Patterns sinnvoll sind). Reihenfolge gemeinsam entscheiden. Bei Unklarheiten
nachfragen.

---

## Twenty-Features — Umsetzungs-Reihenfolge (Operator-/CRM-Flächen)

Von oben nach unten abarbeiten. Jedes Feature einzeln umsetzen, verifizieren,
committen+pushen. Übernimm das PATTERN, nicht Twentys Code. (Aufwand S/M/L)

1. **Token-Disziplin / Design-Foundation** — Aufwand S, Wirkung HOCH
   Bevor irgendwas Neues: in `globals.css` eine ruhige Skala festziehen — EIN Akzent
   (Coral), wenige abgestufte Grautöne, einheitliche Spacing-Schritte, kleine Radii,
   dezente 1px-Borders, konsistente Hover/Active-States. Alles andere baut darauf auf.
   Betrifft: `src/app/globals.css`, quer durch `/app`-Module.

2. **Daten-Tabellen-Upgrade** — Aufwand M, Wirkung HOCH
   Twentys ruhige, dichte Records-Tabelle als Vorbild: einheitliche Zeilenhöhe/Dichte,
   sticky Header, leiser Zebra/Hover, rechtsbündige Zahlen (`tabular-nums`), Status als
   ruhige Chips, konsistente Filter-Chip-Leiste + Pagination. Eine gemeinsame Table-Optik
   für ALLE Listen.
   Betrifft: `/app/{bestellungen,kunden,leads,rechnungen,provisionen}` (jeweils `page.tsx`)
   + `einstellungen/benutzer`, `newsletter/subscribers`.

3. **Record-Detail-Zweispalter** — Aufwand M, Wirkung HOCH
   Stammdaten als ruhige Key/Value-Gruppen links, Activity/Timeline/Notizen/Tasks rechts.
   Konsistent über alle Detailseiten.
   Betrifft: `/app/kunden/[id]`, `/app/leads/[id]`, `/app/bestellungen/[id]`.

4. **Globales Such-/Command-Menu (⌘K)** — Aufwand M–L, Wirkung HOCH
   Twentys Signatur: ein Overlay zum Sofort-Springen zu Record/Modul/Aktion. Desktop = ⌘K,
   Mobile = Such-Sheet aus der Top-Bar. Sucht über Bestellungen/Kunden/Leads/Produkte +
   „Aktionen" (Neuer Artikel, Neue Bestellung…).
   Betrifft: neue Komponente, eingehängt in `app-shell.tsx` (App) + admin-Top-Bar.

5. **Kanban-Politur** — Aufwand M, Wirkung MITTEL
   Kompakte, ruhige Karten (Name + 1–2 Meta-Zeilen + dezenter Status), saubere Spalten,
   flüssiges Drag (Touch-Aktivierungs-Constraint nicht vergessen).
   Betrifft: `/app/crm/pipeline` (`kanban-board.tsx`).

6. **Empty-States, Skeletons & Toasts** — Aufwand S, Wirkung MITTEL
   Einheitliche, freundliche Leerzustände (Icon + Satz + Primär-Aktion), Lade-Skeletons
   statt Sprünge, konsistente Erfolg/Fehler-Toasts. Schneller Politur-Gewinn überall.

7. **Inline-Edit in Tabellen** — Aufwand L, Wirkung MITTEL
   Status/Felder direkt in der Zeile ändern (Chip-Dropdown), ohne Detail-Seite. Erst
   nachdem #2 steht.
   Betrifft: Listen-Zeilen-Komponenten (`*-row.tsx`, `quick-toggle-row.tsx`).

8. **Side-Peek / Slide-over Record-Panel** — Aufwand L, Wirkung NICE-TO-HAVE
   Record im Slide-over öffnen, ohne die Liste zu verlassen. Zuletzt, optional.

> NICHT antasten: Öffentlicher Shop (`(public)`, `home`, `landing`) bleibt
> boutique/editorial — KEINE SaaS-CRM-Nüchternheit dort.

**Reihenfolge-Logik:** #1 ist die Grundlage, ohne die alles Weitere inkonsistent aussieht.
#2–#3 sind das tägliche Brot eines Operators (Listen + Details) → sofort spürbarer Mehrwert.
Das ⌘K-Menü (#4) ist Twentys auffälligstes Feature, aber bewusst erst nach Tabellen/Details
— es glänzt nur, wenn die Ziele dahinter schon gut aussehen.
