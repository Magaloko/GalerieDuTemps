# Codex-Audit-Prompt — Galerie du Temps

> Diesen Block in Codex einfügen nachdem du den Projekt-Ordner ausgewählt hast.
> Sprache: Deutsch oder Russisch — was Codex liefert nimmst du wie's kommt.

---

## Kontext

Du auditierst ein **Next.js-16-Projekt** mit App Router, deployed via **Coolify** (Docker, Standalone-Build) auf einem VPS. Datenbank ist **Supabase Postgres** (Schema `sebo`), Email via Resend/Brevo (Switcher), optional Redis (Upstash), Bilder via lokales Volume mit sharp-Verarbeitung.

**Projekt**: Galerie du Temps — Vintage-Marketplace für Kasachstan-Markt (RU primär, EN/DE/KZ optional). Live-URL: `https://galerie.apps.dadakaev.tech` (später `www.galeriedutemps.com`).

**Tech-Stack**:
- Next.js 16.2.6, React 19.2, TypeScript strict
- Tailwind v4 (kein config-file, nur globals.css)
- next-auth v5 (beta), Stripe (optional), DeepSeek (AI-Assistent)
- ioredis, sharp (Bild-Pipeline), pg (raw queries, kein ORM)
- Vitest 4 + V8 Coverage (148 Tests aktuell grün)

**Architektur-Highlights**:
- 33 SQL-Migrationen in `sql/NNN_*.sql` mit eigenem Tracking (`sebo.schema_migrations`)
- Server-Actions für Mutations, kein tRPC/REST-Layer dazwischen
- Feature-Flags-System (`sebo.feature_flags` + `requireFeature()` Helper)
- Multi-Locale via `marketing_strings` JSONB-KV-Store + `i18n/messages/{ru,en,de,kz}`
- WebP-Image-Pipeline (thumb 400 / medium 800 / large 1600) + Original-Compression
- Custom Site-URL-Helper (`src/lib/site-url.ts`) statt verteilte `process.env.NEXTAUTH_URL`-Reads

**Wichtige Files für deinen Einstieg**:
- `AGENTS.md` + `CLAUDE.md` — Projekt-Konventionen (Coolify, Persistent Volume, ENV-Vars)
- `DEPLOYMENT.md` — Deploy-Workflow
- `docs/DB-CHECK.md` — DB-Diagnostik-Tool (`npm run db:check`)
- `docs/SETUP-RESEND-REDIS.md` — Infrastruktur-Setup
- `scripts/db-check.mjs` + `scripts/db-migrate.mjs` — DB-Tools
- `next.config.ts` — sharp als `serverExternalPackages`, `turbopackIgnore` für Uploads
- `Dockerfile` — Multi-stage Build, Alpine, su-exec User-Drop im Entrypoint

---

## Was ich von dir will

Mache einen **tiefen Audit** und liefere mir einen strukturierten Report. **Kein blindes Refactoring**, nur Befunde + Empfehlungen.

### Priorität 1 — KRITISCH (Production-Risk)

Suche aktiv nach:

1. **Sicherheits-Schwachstellen**
   - SQL-Injection-Risiken (wir bauen Queries teils mit Template-Strings — Array-Literale, `tags`-Field, etc.)
   - XSS-Vektoren (Markdown-Render, `dangerouslySetInnerHTML`, user-generated content)
   - Missing Auth-Checks auf Admin-Routes (`/api/admin/**`, `/api/produkte`, `/api/bilder`)
   - Sensible Daten in Logs (`console.log` mit PII, Stripe-Keys, Tokens)
   - Missing CSRF-Schutz in Server-Actions
   - File-Upload-Validierung (sharp pipeline robust gegen malicious images?)

2. **Race Conditions + Daten-Korruption**
   - Wo werden mehrere DB-Operationen ohne Transaction kombiniert?
   - Counter-Updates, Stock-Reservierung, Coupon-Nutzung — gibt's noch race-gefährdete Stellen außer den schon behobenen?
   - Idempotenz von Stripe-Webhook + Kaspi-Webhook + Telegram-Webhook

3. **Silent Failures**
   - `catch { /* ignore */ }` ohne Logging
   - Fire-and-forget Promises (`.then().catch(console.warn)`) bei kritischen Operationen
   - Fehler die nur loggen aber 200 OK zurückgeben obwohl die Operation nicht durchging

4. **Missing Env-Var-Validierung**
   - `process.env.X` ohne Default, der in production silent failed
   - Wir haben `getSiteUrl()` für NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL — gibt's andere ENVs die ähnlich behandelt werden sollten?
   - Stripe-Keys, Brevo-Keys, DeepSeek-Key fehlen würde was tun?

### Priorität 2 — HOCH (Performance + Robustheit)

5. **N+1 Queries**
   - Listen-Renderings die pro Item nochmal queries machen
   - Insbesondere: Katalog-Page, Featured-Section, Order-Listen, Affiliate-Dashboard

6. **Missing Indexes**
   - Welche WHERE/ORDER BY-Spalten haben kein Index? (Schau in `sql/001_*.sql` + Folge-Migrationen)
   - Speziell für Suche, Filter-Kombinationen, Sortier-Fields

7. **Bundle-Size / Image-Performance**
   - Welche Komponenten werden in den Public-Bundle gezogen die da nicht hingehören?
   - Sharp ist als `serverExternalPackages` markiert — andere Server-only packages die im Client-Bundle landen?

8. **Cache-Strategie**
   - `unstable_cache` Verwendung konsistent?
   - `revalidateTag` korrekt mit `{ expire: 0 }` aufgerufen (Next.js 16 API)?
   - Welche Public-Endpoints sind über-cached / unter-cached?

### Priorität 3 — MITTEL (Code-Qualität + DX)

9. **TypeScript-Strictness**
   - `as unknown as` casts irgendwo noch übrig?
   - `any` versteckt in komplexen Generics?
   - Type-drift zwischen DB-Layer und Frontend (z.B. BIGINT als string vs number — wir haben `types.setTypeParser(20, Number)` aber checke ob alle Stellen das berücksichtigen)

10. **Duplizierter Code**
    - Mehrere Variants des selben Patterns (z.B. Image-Resolution-Logic, Auth-Checks)
    - Komponenten die fast-aber-nicht-ganz dasselbe machen

11. **Dead Code**
    - Unbenutzte Exports
    - Auskommentierte Code-Blocks
    - Komponenten die nirgendwo importiert werden
    - SQL-Migrationen die nichts mehr tun
    - Legacy-Komponenten die durch v2 ersetzt wurden (`HeroReveal` vs `HeroEditorial`)

12. **Inkonsistente Patterns**
    - Wo wird `query()` direkt verwendet statt einer DB-Helper-Funktion?
    - Wo werden Module-Toggles via `isFeatureEnabled()` geprüft, wo direkt vergessen?
    - Wo wird `getSiteUrl()` genutzt vs noch direkt `process.env.NEXTAUTH_URL`?

### Priorität 4 — NIEDRIG (Nice-to-have)

13. **i18n-Lücken**
    - Komponenten mit hartcodierten russischen Strings die durch `t.*` ersetzt werden sollten
    - Fehlende Übersetzungen in `messages/en.ts`, `messages/de.ts`, `messages/kz.ts`
    - Hardcoded TODO i18n: Kommentare die noch da sind

14. **Accessibility**
    - Missing alt-text auf entscheidenden Bildern
    - Form-Labels die nicht via `<label for>` verlinkt sind
    - Keyboard-Navigation in modalen UIs (Bilder-Manager-Galerie z.B.)
    - ARIA-Attribute auf Custom-Widgets

15. **Tests-Coverage**
    - Welche kritischen Code-Pfade haben keine Tests?
    - DB-Tests sind in `src/lib/__tests__/db-*.test.ts` mit `describe.skipIf(!testDbAvailable())` — laufen nur wenn `TEST_DATABASE_URL` gesetzt. Sind alle Custer-Migrations + neuen Features (Feature-Flags, Instagram-URLs, Image-Pipeline) abgedeckt?

16. **Mobile-UX**
    - Welche Admin-Pages funktionieren auf Phone nicht gut?
    - Touch-Targets zu klein?
    - Mobile-Tab-Bar Konflikte mit anderen Fixed-Elementen?

---

## Was ich KONKRET zurück will

Liefere mir ein einzelnes Markdown-Dokument mit dieser Struktur:

```
# Audit-Report — Galerie du Temps

## Zusammenfassung
- N kritische Befunde
- N hoch-priorisierte Befunde
- Top-3-Empfehlungen

## Kritische Befunde
### [KRIT-1] Titel
- **Datei**: src/.../foo.ts:42
- **Problem**: ...
- **Auswirkung**: ...
- **Fix**: ... (konkret, kopierbar)

### [KRIT-2] ...

## Hohe-Priorität-Befunde
...

## Mittel-Priorität-Befunde
...

## Niedrig-Priorität-Befunde
...

## Patterns / systemische Probleme
- Architektur-Smells die mehrere Files betreffen
- Empfehlungen für globale Verbesserungen

## Was bereits sauber ist
- Kurze Liste positiver Befunde (was nicht angefasst werden muss)
```

### Regeln

- **Sei spezifisch**: Datei + Zeilennummer, kein „irgendwo in der Codebase"
- **Sei pragmatisch**: nicht jeden TypeScript-Stil-Pedantismus — nur Befunde die WIRKLICH ein Problem sind
- **Sei priorisiert**: ein KRITISCH-Befund pro 50 niedrig-priorisierte Befunde — finde die wichtigen, nicht die meisten
- **Begründe**: warum ist das ein Problem? Was passiert im worst case?
- **Konkrete Fixes**: zeig den Code-Snippet wie der Fix aussehen würde, nicht nur „validate input"
- **Keine LGTM-Punkte**: keine Befunde wo der Status quo OK ist (außer im "Was bereits sauber ist"-Abschnitt)
- **Nichts blind refactoren**: nur READ + REPORT, kein code-write

### Wenn du dir nicht sicher bist

Markiere unsichere Befunde mit **[VERIFIZIEREN]** und beschreibe wie ich den Befund manuell bestätigen kann (z.B. „Führe `grep -r 'foo' src/` aus, wenn mehr als 3 Treffer kommen ist es ein Problem").

### Aktuelle bekannte offene Punkte (musst du NICHT erneut melden)

- Coupon-Race-Condition — schon behoben (commit `cbcc656`)
- Site-URL-Helper — schon eingeführt (commit `cbcc656`)
- `as unknown as NextResponse` casts — schon weg (commit `268e220`)
- BIGINT-Type-Parser in pg — schon konfiguriert
- Sticky Save-Bar im Produkt-Form — schon da (commit `0cf2c2f`)
- WebP-Bild-Varianten — schon implementiert (commit `4e1d809`)
- Feature-Flags-System — fertig (commit `c5afbeb`)
- SQL-Migrations-Sequence robust — fertig (commit `268e220`)

Aber: prüfe diese Bereiche trotzdem auf NEUE Probleme die wir nicht bemerkt haben.

---

Bring deinen Befund-Report sobald du fertig bist. Vielen Dank!
