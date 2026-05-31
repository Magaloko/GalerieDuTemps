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

- **KI-Key im Admin ✓** — DeepSeek-Key unter „Настройки → ИИ" (`/einstellungen/ki`) eintragbar
  (DB-gespeichert, ENV-Fallback). ⚠️ **Offen (Nutzer-Aktion):** Der Admin muss den Key dort eintragen —
  aktuell fehlt er überall (DB + ENV), daher sind Assistent + Produkt-„KI-Ausfüllen" bis dahin inaktiv.
- **Kategorie-Verwaltung ✓** — sortierbare Liste (Drag/Pfeile), Gruppierung (Parent, 2 Ebenen),
  Inline-Aktiv-Toggle, Batch-Save; + 7 Kategorien als Sollzustand. Nächster Nutzer-Wunsch: zurück zum
  **Produkt-Bereich**.
- **Produkt-Bereich (laufender Strang):** Formular-Struktur (`FormSection`) ✓, Shop-Galerie-Bild-Fallback
  + Cleanup ✓, „KI-Ausfüllen" (`KiFuellenBlock`) ✓, Katalog-Karten-Bild-Fallback (`ProduktKarte`) ✓,
  **Formular-Optik auf helle App-Tokens ✓** (paper/bone/coral + weiche Radien; `tone="shop|app"`-Opt-in
  an `Input/Textarea/Select/MultilingualInput/PreisMultiCurrency/RichTextEditor` — Shop bleibt dunkel
  unberührt). **Editor-Bausteine auf helle App-Tokens ✓** — `BildManager`/`BildUploadZone`/`BildGalerie`,
  `InstagramUrlsInput`, `ProduktStoryEditor` (nur Chrome; `BlockPreview` bleibt Shop-treu), `SingleMediaUpload`
  (`tone="app"`), `Dateien-`/`ZertifikateManager` + `bilder`-Seiten-Header; `ConditionMeter` Token-Hygiene
  (inaktive Segmente `--color-line`). Damit ist der ganze Produkt-Editor (Voll + Schnell + Bilder-Seite) hell.
  **Detailseiten-Feinschliff ✓** (öffentliche `katalog/[slug]`): Gewicht-Einheit-Fix (г→кг), „Похожие
  товары" via `<Suspense>` gestreamt, Lightbox-Wischgeste mobil. Hinweis: client-interaktive `/app`-
  Änderungen lassen sich im Dev wegen PWA-Service-Worker-Cache schlecht visuell prüfen → live nach Deploy
  testen (Memory `dev-preview-setup`).
- **🔎 Audit-Backlog (Gesamt-Audit 2026-05-31, 5 Agenten + Verifikation):** P0/Quick-Win-P1
  bereits gefixt (Commit `ec5cafc`): JWT-Rolle-Default→`customer`, `kategorie_slug`
  in Detail-Breadcrumb, Newsletter-Segment-Versand (fail-safe). **Offen, noch NICHT angefasst:**
  - **P0 MwSt ✓ GEFIXT** (`api/checkout/route.ts` + `system-einstellungen.ts`): `getItemTaxRate()` statt
    hartem `19` → KZ-НДС 12 % auf alle Bestellungen (Client-Cart zeigte schon 12 %, nur Server war falsch);
    `firma_land`-Default `"DE"`→`"KZ"`. Betrifft alle Zahlwege (tax_rate wird im gemeinsamen Loop gesetzt).
  - **⚠️ P0/P1 Währung — ENTSCHEIDUNG offen (Zahlungs-Code, nicht blind angefasst):** Stripe-Line-Items
    laufen mit `"eur"` bzw. `order.waehrung ?? "EUR"` — aber **`waehrung` existiert weder als Order-Spalte
    noch im SQL** → Fallback immer `"EUR"`. Shop ist **rein KZT** (alle Produkte KZT). Trifft NUR den
    `stripe_card`-Weg; Kaspi/Bank/Vor-Ort/Anzahlung nutzen `total_cents` (KZT) direkt → unbetroffen.
    Fix = Currency auf `"kzt"` setzen (`route.ts:300`, `checkout/stripe/route.ts:90`, `getOrCreateStripeCoupon`
    `route.ts:363`). Vor Umsetzung klären: (a) ist `stripe_card` in KZ überhaupt aktiv/genutzt? (b) Stripe
    behandelt KZT als 2-Dezimal (×100 wie jetzt) — bestätigen, sonst 100× daneben.
  - **P1 kein `src/middleware.ts`:** keine Edge-Schutzschicht; jede Route nur per Eigen-Check.
  - **P1 `EMAXCONNSESSION`:** Pool `max:10` (`db/index.ts:33`) vs. Supabase Session-Mode-Limit 15 →
    Transaction-Mode-Pooler (Port 6543) in `DATABASE_URL`.
  - **P1 a11y:** Lightbox/CommandMenu/MobileDrawer ohne `role=dialog`/`aria-modal`/Focus-Trap.
  - **P1 `robots.ts`:** `/app`,`/tg`,`/kunde`,`/affiliate`,`/monitoring` crawlbar (nicht disallowed).
  - **P1 ESLint fehlt komplett** (kein Dep/Config/Script) → `next build` lintet nicht.
  - **P1 Public-Seiten `about`/`instagram`/`kategorien/[…]`** noch dunkle `vintage-*` auf hell → Kontrast ~1:1.
  - **P2:** Theme-CSS-Injection (`theme.ts:117` ungefilterte Keys), TG-Webhook Header-Check optional,
    CSP quasi leer, Cron ohne `timingSafeEqual`, Temp-Passwort im Klartext per Mail, `_eur`-Namensfalle
    (KZT-Felder heißen `_eur`), N+1 Bild-Subqueries, fehlende `generateStaticParams`.
  - **Hinweis:** `revalidateTag(tag,{expire:0})` ist KORREKT (Next-16-Signatur, 2. Param required) — kein Bug.
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

- 2026-05-31 00:30 UTC · `(dieser Commit)` · fix(checkout) KZ-НДС 12 % statt hart 19 %: Server-Checkout
  (`api/checkout/route.ts`) nutzt jetzt `getItemTaxRate({tax_exempt, liefer_land, reverse_charge})` statt
  des hartkodierten `19` — Steuer-Land aus `firma_land` (einmal oben geladen, doppeltes Laden entfernt);
  `firma_land`-Default `"DE"`→`"KZ"` (`db/system-einstellungen.ts`). Damit zieht der Server denselben 12-%-
  Satz wie der Client-Cart (`AddToCartButton taxRate={12}`) — vorher inkonsistent (Client 12 %, Order 19 %).
  НДС ist inklusiv → Gesamtpreis unverändert, nur die Steuer-Aufschlüsselung/Rechnung wird korrekt (KZ).
  Greift auf ALLE Zahlwege (tax_rate im gemeinsamen Item-Loop). Nutzer-Kontext: „Besucher kaufen direkt im
  Shop, normal." Währungs-Bug (Stripe `eur`) bewusst NICHT mitgefixt — Zahlungs-Code, braucht Entscheidung
  (s. Audit-Backlog). Verifiziert: tsc grün, vitest 176✓, next build grün.
- 2026-05-31 00:00 UTC · `ec5cafc` · fix(security/data) Audit-P0/Quick-Win-P1: (1) **JWT-Rolle
  fail-closed** — `token.role`/`session.user.role` defaulten jetzt auf `"customer"` statt `"admin"`
  (`lib/auth/config.ts`); ein rollenloses/migriertes Token wird nie mehr Admin (Defense-in-Depth, der
  AuthZ-Gate liest `session.user.role`). (2) **`kategorie_slug`** in `oeffentlichesProduktBySlug`
  (`db/produkte-public.ts`, SELECT + GROUP BY) → die Detail-Breadcrumb-JSON-LD enthält wieder die
  Kategorie-Ebene (war still übersprungen, SEO). (3) **Newsletter-Segment-Versand** repariert
  (`db/newsletter.ts`): `newsletterEmpfaengerSammeln(segmentId)` lädt jetzt den Segment-Filter und löst
  über `segmentVorschau()` die echten Empfänger auf — **fail-safe** (unbekanntes/leeres Segment → 0, NIE
  „an alle"; vorher ignorierte der Zweig die segmentId und sendete an jeden). Rein Backend/Daten — keine
  UI. Verifiziert: tsc grün, vitest 176✓/39 skip, next build grün. Restliche Audit-Funde im Backlog
  (Abschnitt „🔎 Audit-Backlog" oben).
- 2026-05-30 23:01 UTC · `7dc911b` · design(public) Detailseiten-Feinschliff `katalog/[slug]`:
  Gewicht-Einheit-Fix in den Характеристики (`г` → `кг` — der Admin pflegt das Maß als Kilogramm, die
  Detailseite zeigte fälschlich Gramm); „Похожие товары" als eigene `<Suspense>`-Insel
  (`AehnlicheProdukteSektion`) — ihr separater DB-Query blockt den First Paint nicht mehr (lag unter dem
  Fold, lief aber als sequenzieller Roundtrip vor dem Render); Lightbox bekommt eine horizontale
  Wischgeste (Pointer-Swipe > 50px) fürs Blättern auf Mobile (vorher nur Tastatur/Pfeile). Rein
  visuell/UX — Daten/Wiring unberührt. Verifiziert: tsc grün, vitest 176✓, next build grün
  (`/katalog/[slug]`-Route vorhanden, 404-sauber ohne Seed-DB). Visuell live nach Deploy.
- 2026-05-31 00:29 UTC · `89106f0` · design(app) Produkt-Editor-Bausteine auf helle App-Tokens:
  Restliche dunkle Cobalt-`vintage-*`-Flächen im Produkt-Editor auf paper/bone/coral + weiche
  `--radius-app` umgezogen — Bild-Verwaltung (`BildManager`/`BildUploadZone`/`BildGalerie`, Foto-Hover-Veil
  bewusst dunkel), `InstagramUrlsInput`, `Dateien-`/`ZertifikateManager`, `produkte/[id]/bilder`-Header,
  Story-Editor-Chrome (`ProduktStoryEditor`; `BlockPreview` bleibt Shop-treu) und `SingleMediaUpload`
  (neues `tone="shop|app"`, Vollformular nutzt `tone="app"`). `ConditionMeter`: inaktive Segmente auf
  `--color-line` (Token-Hygiene; rendert auf der bereits hellen öffentlichen Detailseite). Rein visuell —
  Upload-/dnd-/Fetch-Logik + Russisch unberührt. Verifiziert: tsc grün, vitest 176✓, next build grün.
- 2026-05-30 21:52 UTC · `6340ac4` · design(app) Produkt-Formular-Optik auf helle App-Tokens:
  Opt-in-Prop `tone="shop"|"app"` (Default `shop` = unverändert dunkler Shop) an `Input/Textarea/Select`,
  `MultilingualInput`, `PreisMultiCurrency` und `RichTextEditor`; das Voll- + Schnell-Formular,
  `FormSection`, `KiFuellenBlock` sowie die Produkt-Editor- & Schnell-Seiten-Header ziehen auf
  paper/bone/coral + weiche `--radius-app`-Radien um (statt Cobalt-`vintage-*`-Dunkeltheme). Markdown-
  Editor (Lexical) bekommt eine helle App-Variante. Cleanup: tote Imports (`MarkdownEditor`, `useRef`) im
  Vollformular entfernt. Rein visuell — alle `name`/Handler/Server-Action-Wiring unberührt; Shop-Formulare
  unangetastet. Verifiziert: tsc grün, vitest 176✓, next build grün. (Visuell live nach Deploy — PWA-SW
  blockt /app-Vorschau im Dev.)
- 2026-05-30 20:51 UTC · `49140a6` · feat(app) DeepSeek-Key im Admin pflegbar: neue Seite
  „Настройки → ИИ" (`/einstellungen/ki`) — Key eintragen/löschen/Verbindungstest; gespeichert in
  `sebo.affiliate_einstellungen` (`deepseek_api_key`), ENV `DEEPSEEK_API_KEY` bleibt Fallback.
  `getDeepseekClient` jetzt async (DB > ENV), Aufrufer (Produkt-Extraktor + Assistent-Chat) auf await.
  Key in der UI maskiert, nie im Code/Log. Deckt Assistent + Produkt-„KI-Ausfüllen" ab. Live getestet.
- 2026-05-30 20:23 UTC · `5e56b7f` · design(public) Detailseite-Feinschliff: Mobile-Preis-Strip
  jetzt bei jedem kaufbaren Produkt (vorher nur mit WhatsApp/Telegram) — Preis + „Написать" direkt nach
  der Galerie sichtbar statt erst weit unten in der Sidebar. teaser/verkauft ausgenommen. Visuell auf
  Mobile verifiziert (öffentliche Route).
- 2026-05-30 20:15 UTC · `d31ea11` · feat(app) Kategorie-Verwaltung: sortierbare Listen-UI
  (`KategorieVerwaltung`) — Drag&Drop (dnd-kit) + Pfeil-Buttons ↑↓ für die Reihenfolge, hierarchische
  Anzeige (Unterkategorien eingerückt), Inline-Parent-Dropdown zum Gruppieren (2 Ebenen), Inline-Aktiv-
  Toggle, Batch-Save (`kategorienStrukturAction` → atomares UNNEST-UPDATE in `kategorienStrukturSpeichern`).
  Server-Render verifiziert (Liste lädt, 200); Interaktion live testen (PWA-SW-Block auf /app im Dev).
- 2026-05-30 18:06 UTC · `b1ad0c2` · data(kategorien) 7 Produkt-Kategorien als Sollzustand
  (idempotentes `scripts/seed-kategorien.mjs`): NEU Столовые приборы/`besteck`, Ювелирные изделия/`edelschmuck`,
  Часы/`uhren`, Посуда/`geschirr`, Посеребренные…/`versilbert` (+ Beschreibung); Декор/`deko` & Украшения/`schmuck`
  aktualisiert; Фарфор/Текстиль/Искусство/Кухня deaktiviert (aktiv=false, Daten bleiben). Slugs deutsch
  (Konvention), Reihenfolge sort 1–7. Direkt in die Prod-DB geschrieben → dieser Deploy frischt den
  300s-Public-Cache sofort.
- 2026-05-30 17:47 UTC · `f31f9f8` · design(public) Katalog-Karten (`ProduktKarte`): Bild-Fallback
  wie in der Galerie — tote/fehlende `hauptbild_url` (next/image) fällt sauber auf den „Без фото"-Placeholder
  zurück (onError + ref-Mount-Check für SSR-Fehler vor Hydration, deckt priority/eager-Bilder ab). Rundet die
  Bild-Robustheit shop-weit ab. (Verifiziert: tsc grün, onError am Karten-img gebunden, keine false positives
  bei gültigen Bildern; echtes Auslösen mangels toter Test-Bilder nicht visuell, Mechanismus identisch zur Galerie.)
- 2026-05-30 17:16 UTC · `1b1124e` · feat(app) Produkt-Formular „KI-Ausfüllen": neuer
  `KiFuellenBlock` über dem Editor-Formular — Notizen → DeepSeek-Extraktor befüllt Name, Beschreibung,
  Epoche, Herkunft, Material, Zustand, Tags + SEO (Server-Action `produktKiAusfuellenAction`, danach
  `router.refresh()`). Nutzt dieselbe Infra wie Schnell-Flow + Entwürfe-Queue; standardmäßig
  eingeklappt, Preis/Fotos/Sichtbarkeit bleiben unberührt. (Visuelle Interaktiv-Prüfung im Dev durch
  PWA-Service-Worker-Cache auf /app blockiert — Code via tsc/build + Server-Render verifiziert, live testbar.)
- 2026-05-30 15:58 UTC · `b19f83d` · design(public) Produkt-Darstellung (Shop): Galerie mit
  robustem Bild-Fallback — `GalleryImg` ersetzt rohe `<img>`, fängt Ladefehler ab (SSR-vor-Hydration
  via Mount-Check + Laufzeit via onError) und zeigt einen ruhigen „Фото недоступно"-Platzhalter statt
  des Broken-Image-Icons (relevant bei fehlendem Persistent Volume → AGENTS.md). Cleanup: tote
  `katalog/[slug]/client.tsx` entfernt + tote `Heart`/`Share2`-Lint-Platzhalter in der Detail-`page.tsx`.
- 2026-05-30 15:28 UTC · `d2920eb` · feat(app) Produkt-Formular „Hinzufügen": einheitlicher
  `FormSection`-Wrapper für alle 11 Sektionen; Kern (Основная/Фото/Цены/Описания/Детали/Видимость)
  bleibt offen, optionale (История/Размеры/Видео/Instagram/SEO) sind einklappbar — offen nur wenn
  befüllt, eingeklappte Felder bleiben via `display:none` im DOM (kein Datenverlust beim Speichern).
  Toter „Сначала сохрани"-Foto-Zweig entfernt (Draft-Flow deckt Foto-first bereits ab).
- 2026-05-30 · `ffa447d` · chore: Sitzungs-Onboarding — Identitäts-Check (AGENTS.md §0),
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
