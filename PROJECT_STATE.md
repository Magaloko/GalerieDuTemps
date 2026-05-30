# PROJECT_STATE — Galerie du Temps

> **Lebendes Stand-Dokument.** Wird bei JEDEM Push aktualisiert (erzwungen durch
> `.githooks/pre-push`). Eine neue Claude-Code-Sitzung liest zuerst diese Datei,
> um den aktuellen Stand zu übernehmen. Pflege-Regeln stehen in `AGENTS.md §0`.

---

## 🔒 Projekt-Identität (Fingerprint)

| Merkmal | Sollwert |
|---|---|
| **Git-Remote** | `https://github.com/Magaloko/GalerieDuTemps.git` |
| **package.json `name`** | `galeriedutemps` |
| **Produkt** | Galerie du Temps — Vintage-/Antiquitäten-E-Commerce, Almaty/KZ |
| **Live-URL** | https://galerie.apps.dadakaev.tech (Coolify-Deploy bei Push auf `main`) |
| **Primärsprache UI** | Russisch (RU) |

> **Wenn Remote ODER package-name nicht exakt passt: STOPP.** Du bist im falschen
> Projekt — nichts ändern, den Nutzer informieren. (Details: `AGENTS.md §0`.)

---

## 🧱 Stack

Next.js **16.2.6** (Breaking Changes! → vor Code `node_modules/next/dist/docs/` lesen) ·
React 19 · TypeScript · Tailwind v4 (`@theme` in `globals.css`) · Postgres (Supabase,
Schema `sebo.`) · NextAuth v5 · Redis (Upstash) · Deploy via Coolify.

---

## 🎨 Design-System (Kurzfassung)

- **Tokens & alle Klassen:** `src/app/globals.css` (`@theme` + unlayered Komponenten-Kits).
- **Hybrid-Radius (bewusst zwei Welten):** Web/Shop + Klassik-`/admin` = **scharf/editorial**
  (`--radius-vintage:2px`, `--radius-card:4px`); Operator-`/app` + Telegram = **weich**
  (`--radius-app:10px`, `--radius-app-lg:14px`, `--radius-pill:999px`).
- **EIN Akzent:** Coral (`--color-coral #E8703A`). Flächen: Paper/Bone/Line/Ink.
- **Referenz Operator/CRM = Twenty CRM** (nur Patterns, kein Code). Shop = boutique/editorial,
  NICHT SaaS-nüchtern.
- **Wiederverwendbare Kits** (alle in `globals.css`): `.app-*` (Shell), `.surface/.kpi/
  .data-table/.chip/.filter-tab/.btn-line/.field-input/.row-action/.empty-state` (Listen),
  `.record-*/.field-*/.amount-*/.timeline-*` (Detail), `.kanban-*`, `.command-*` (⌘K),
  `.chip-select` (Inline-Edit), `.peek-*` (Side-Peek).
- Geteilte Modul-Listen liegen unter `src/app/(admin)/admin/*` und werden von `/app/*`
  re-exportiert → eine Änderung trifft **beide** Flächen.

---

## ✅ Aktueller Stand — fertig & deployed

**Twenty-CRM-Roadmap (`docs/DESIGN_SESSION.md`) komplett #1–#8:**

| # | Feature | Commit |
|---|---|---|
| #1 | Token-Disziplin / Design-Fundament (Hybrid-Radius, `.app-*`) | `9e9f84b` |
| #2 | Daten-Tabellen-Kit (A1) — alle 5 Operator-Listen | `7f8f6f6` |
| #3 | Record-Detail-Zweispalter (bestellungen/kunden/leads [id]) | `0c321c2` |
| #4 | ⌘K Command-Menu (+ `/api/admin/suche`) | `7377839` |
| #5 | Kanban-Politur (Touch-Sensor-Constraint, DragOverlay) | `377a880` |
| #6 | Skeletons + Toast-Polish (`/app` loading.tsx) | `64093f3` |
| #7 | Inline-Edit Bestellstatus (`.chip-select`) | `45c3cec` |
| #8 | Side-Peek/Slide-over Bestellungen (`OrderPeek`) | `fc878b0` |
| — | Öffentlicher Shop P1/P2 (Card-Vereinheitlichung + `.eyebrow`) | `e1cfd3c` |

**Responsiveness Welle 1+2** (viewport-fit, Safe-Area, dvh, Tab-Bar-Höhen-Vars,
Telegram-Dark-Basics) und die komplette `/app`-Routen-Migration (21 Module unter echten
`/app/*`-URLs) waren bereits vor dieser Design-Serie fertig.

---

## 🚧 Offen / mögliche nächste Schritte

- **TG1 — Telegram Dark-Mode-Lücken:** harte `#fff`-Fallbacks in `src/app/(telegram)/**`,
  Texte hart `#1a1410`/`#fff`, Order-Status-Farben ohne `[data-tg-theme="dark"]`-Override.
- **Pattern-Ausweitung (wiederverwendbar):** `.chip-select` (Inline-Edit) → Lead-Status /
  Kunden-Typ; `OrderPeek`-Mechanik (Event `gdt:peek-order` + Route + Panel) → analoger
  CustomerPeek / LeadPeek.
- Kunden-/Affiliate-Bereich: KA2 (Affiliate hat keine Mobile-Nav, `ml-64` überlappt).

---

## 🛠️ Arbeitskonventionen (Pflicht)

- **Verifizieren vor „fertig":** `npx tsc --noEmit`, `npx vitest run`, `npx next build` grün.
- **Visuell prüfen:** Dev-Server (`npm run dev -- -p 3005`) + Preview-MCP; auth-gated Seiten
  (`/app`,`/admin`) → einloggen. CSS-Verifikation: kompiliertes Stylesheet per curl grepen
  ODER `<link>` cache-busten (Preview cacht altes CSS hartnäckig).
- **Build-Check:** `next build`-Exit aus dem Log parsen — NICHT dem Bash-Wrapper-Exit trauen.
- **Auto-Commit+Push** bei fertiger & verifizierter Aufgabe (= Coolify-Deploy). Semantische
  Commits auf Deutsch (`feat()/fix()/design()/refactor()`), Body Stichpunkte, Ende
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. `.codex/` + `.claude/` NIE
  mitcommitten — gezielt `git add`.
- **PFLICHT vor jedem Push:** Changelog-Eintrag unten ergänzen (sonst blockt `pre-push`).

---

## 📜 Changelog (neueste zuerst)

> Format: `YYYY-MM-DD HH:MM UTC · <commit> · <Beschreibung>`. Nach jedem Push ein
> Eintrag (erzwungen durch `.githooks/pre-push`). Hash = der Commit, der gepusht wird.

- 2026-05-30 · `(dieser Commit)` · chore: Sitzungs-Onboarding — Identitäts-Check (AGENTS.md §0),
  PROJECT_STATE.md als lebendes Stand-Dokument, `.githooks/pre-push`-Guard (erzwingt
  Changelog-Pflege bei jedem Push).
- 2026-05-30 · `fc878b0` · design(app) #8 — Side-Peek/Slide-over für Bestellungen-Liste.
- 2026-05-30 · `45c3cec` · design(app) #7 — Inline-Edit Bestellstatus (Chip-Dropdown).
- 2026-05-30 · `377a880` · design(app) #5 — Kanban-Politur (Touch-Constraint, DragOverlay).
- 2026-05-30 · `e1cfd3c` · design(public) P1/P2 — Shop Card-Vereinheitlichung + Eyebrow.
- 2026-05-30 · `64093f3` · design(app) #6 — Skeletons + Toast-Polish (/app).
- 2026-05-30 · `7377839` · design(app) #4 — ⌘K Command-Menu (+ /api/admin/suche).
- 2026-05-30 · `0c321c2` · design(app) #3 — Record-Detail-Zweispalter.
- 2026-05-30 · `7f8f6f6` · design(app) A1 — Twenty-CRM-Tabellen-Kit (alle Operator-Listen).
- 2026-05-30 · `9e9f84b` · design(ui) Fundament — Hybrid-Radius-Tokens + `.app-*`-Klassen.
