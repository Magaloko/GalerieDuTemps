<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# §0 — IDENTITÄT & STAND (ZUERST LESEN, BEVOR DU IRGENDETWAS TUST)

Dieses Repo ist **Galerie du Temps** (Vintage-/Antiquitäten-E-Commerce, Almaty/KZ).
Bevor du arbeitest, **verifiziere zwingend, dass du im richtigen Projekt bist** — diese
Datei wird ordnergebunden geladen, aber ein falsch geöffneter Ordner darf NIE mit einem
anderen Projekt verwechselt werden.

### Identitäts-Check (Pflicht, ganz am Anfang)

Führe aus und prüfe BEIDE Werte:

```bash
git remote get-url origin     # MUSS enthalten:  Magaloko/GalerieDuTemps
node -e "console.log(require('./package.json').name)"   # MUSS sein:  galeriedutemps
```

- **Beide korrekt** → weiter. Sag dem Nutzer in einem Satz, dass die Identität bestätigt ist.
- **Irgendetwas weicht ab** (anderer Remote, anderer Name, Dateien fehlen) → **STOPP.**
  Nichts ändern, nichts committen. Melde dem Nutzer: „Falsches Projekt — erwartet
  galeriedutemps / Magaloko/GalerieDuTemps, gefunden: <X>." Erst weiter, wenn geklärt.

### Stand übernehmen

Lies **`PROJECT_STATE.md`** (im Repo-Root) — das ist das lebende Stand-Dokument:
aktueller Feature-Stand, offene Punkte, Konventionen, Changelog. Es ist nach jedem Push
frisch (siehe unten). Damit kennst du sofort den echten Stand, ohne zu raten.

### PFLICHT bei JEDEM Push — Stand dokumentieren

Nach JEDER fertigen, verifizierten Aufgabe wird committet + nach `main` gepusht
(= Coolify-Deploy). **Teil jedes solchen Commits ist die Pflege von `PROJECT_STATE.md`:**

1. **Changelog-Eintrag** oben in die Changelog-Liste (neueste zuerst), Format
   `YYYY-MM-DD HH:MM UTC · <commit-hash> · <was geändert wurde>`.
   - UTC-Timestamp holen: `date -u +"%Y-%m-%d %H:%M UTC"`.
   - Den Hash beim ersten Schreiben als `(dieser Commit)` notieren; nach dem Commit
     den echten Kurz-Hash eintragen (z.B. via `--amend`) ODER ihn im nächsten Eintrag
     korrekt referenzieren — Hauptsache der Changelog bleibt nachvollziehbar.
2. Bei Feature-Abschluss zusätzlich „Aktueller Stand" / „Offen" in `PROJECT_STATE.md`
   aktualisieren.
3. `PROJECT_STATE.md` **mit** committen (gezielt `git add`).

**Technische Erzwingung:** `.githooks/pre-push` **blockt jeden Push**, dessen jüngster
Commit `PROJECT_STATE.md` nicht angefasst hat. Aktivierung pro Klon (einmalig, prüfe das
beim Start):

```bash
git config core.hooksPath    # soll ".githooks" sein; falls leer:
git config core.hooksPath .githooks
```

Notfall-Override (nur triviale Fälle, bewusst): `GDT_SKIP_STATE=1 git push`.

---

## Production / Coolify Deployment

### Persistent Volume für Upload-Bilder

Produkt-Bilder werden serverseitig im Filesystem gespeichert. Ohne Persistent
Volume gehen **alle Bilder bei jedem Container-Rebuild verloren**.

**Coolify-Konfiguration:**

In der App in Coolify → **Storage** → **Add Persistent Volume**:
- **Source name:** `vintage-uploads`
- **Destination path:** `/app/public/uploads`

Oder alternativ mit Environment-Variable:
- ENV setzen: `UPLOAD_DIR=/data/uploads`
- Volume mounten: `vintage-uploads` → `/data/uploads`

Nach dem Mount: App neu deployen. Files die vor dem Mount geschrieben wurden
sind verloren — Re-Upload aller Produktbilder notwendig.

**Diagnose:** Status prüfen via `GET /api/health/uploads` — gibt JSON mit
aufgelöstem UPLOAD_DIR, Existenz-Check und File-Count zurück.

### Weitere kritische ENV-Variablen

```
DATABASE_URL              # Postgres connection
NEXTAUTH_URL              # Site-URL (für Auth-Callbacks)
NEXT_PUBLIC_SITE_URL      # Site-URL (für metadataBase, Schema, Canonical)
NEXTAUTH_SECRET           # Auth-Session-Secret
UPLOAD_DIR                # Optional, default /app/public/uploads
STRIPE_SECRET_KEY         # Falls Stripe-Zahlung
BREVO_API_KEY             # Falls Brevo für Newsletter/Transaktional
EMERGENCY_SHOP_DISABLE    # Notfall: "true" → erzwingt sofort Schaufenster-Modus
                          #   (kaufen_aktiv=false, fail-closed) ohne Deploy/DB-Write.
                          #   Sperrt alle Kaufpfade serverseitig + kippt die UI in
                          #   den Vitrinen-Zustand. Wieder entfernen = Normalbetrieb.

# Sentry (Error-Tracking, optional — ohne DSN ist Sentry no-op)
NEXT_PUBLIC_SENTRY_DSN    # Client-DSN (Browser-Fehler + Session-Replay)
SENTRY_DSN                # Server-/Edge-DSN (Server-Components, Route-Handler,
                          #   Server-Actions via onRequestError)
SENTRY_ORG                # Nur Build-Zeit: Source-Map-Upload (withSentryConfig)
SENTRY_PROJECT            # Nur Build-Zeit: Source-Map-Upload
SENTRY_AUTH_TOKEN         # Nur Build-Zeit: Source-Map-Upload (CI/Coolify-Build)
```
