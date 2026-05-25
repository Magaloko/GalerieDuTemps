# Deployment-Anleitung — Galerie du Temps

Schritt-für-Schritt-Anleitung für das Deployment auf einem Hostinger VPS
(oder beliebigem Linux-Server mit Docker).

**Stack:** Docker Compose → Caddy (TLS) → Next.js + PostgreSQL + n8n

---

## 0. Voraussetzungen

- Ein VPS mit:
  - Ubuntu 22.04 LTS (oder neuer) / Debian 12
  - Mindestens 2 GB RAM, 20 GB SSD
  - Public IPv4
  - Root- oder sudo-Zugang
- Eine Domain `galeriedutemps.kz` (oder eigene)
- DNS-A-Records gesetzt:

  | Subdomain | Typ | Wert |
  |---|---|---|
  | `galeriedutemps.kz` | A | `<VPS-IP>` |
  | `www.galeriedutemps.kz` | A | `<VPS-IP>` |
  | `n8n.galeriedutemps.kz` | A | `<VPS-IP>` |

- Optional: Server-SSH-Schlüssel im GitHub-Konto hinterlegt (für `git pull`)

---

## 1. Server vorbereiten

```bash
# Auf VPS einloggen
ssh root@<vps-ip>

# System aktualisieren
apt update && apt upgrade -y

# Docker + Compose-Plugin installieren
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git

# Firewall: nur 80, 443, 22 erlauben
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Unattended-Upgrades für Security-Patches
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## 2. Repo klonen + konfigurieren

```bash
cd /opt
git clone https://github.com/Magaloko/GalerieDuTemps.git galeriedutemps
cd galeriedutemps

# .env.local anlegen — alle "HIER_..."-Werte ersetzen!
cp .env.example .env.local
nano .env.local
```

**Mindestens diese Werte ausfüllen:**

| Variable | Wie generieren |
|---|---|
| `POSTGRES_PASSWORD` | beliebiges starkes Passwort (z.B. `openssl rand -base64 24`) |
| `DATABASE_URL` | `postgresql://vintage_user:<POSTGRES_PASSWORD>@db:5432/vintage_market` |
| `NEXTAUTH_SECRET` | `npm run db:generate-secret` (lokal vorher ausführen) oder `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://galeriedutemps.kz` |
| `DEEPSEEK_API_KEY` | von https://platform.deepseek.com |
| `BREVO_API_KEY` | von https://app.brevo.com/settings/keys/api |
| `IBAN_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `REFERRAL_CODE_SALT` | `openssl rand -hex 16` |
| `STRIPE_SECRET_KEY` | von https://dashboard.stripe.com → erst `(Test-Modus-Key)`, später `(Live-Modus-Key)` |
| `STRIPE_WEBHOOK_SECRET` | aus Stripe-Dashboard → Webhooks → endpoint `/api/stripe/webhook` |
| `N8N_BASIC_AUTH_PASSWORD` | starkes Passwort |

> **NIE** `.env.local` in Git committen — die ist in `.gitignore` ausgeschlossen.

---

## 3. Container starten

```bash
docker compose up -d --build

# Logs prüfen (während Caddy TLS-Zertifikate holt — dauert 30-60s)
docker compose logs -f
# CTRL+C zum Beenden des Live-Logs (Container laufen weiter)
```

---

## 4. Datenbank-Migrationen ausführen

```bash
# Ausführen — Script erkennt automatisch, welche schon ausgeführt sind
docker exec -it vintage_app npm run db:migrate

# Erwartete Ausgabe:
# ✦ galeriedutemps · DB-Migrationen
#   → 001_sebo_schema.sql        ausführen ... ✓ (45ms)
#   → 003_affiliate_schema.sql   ausführen ... ✓ (32ms)
#   ...
#   ✦ Fertig. 10 neu · 0 bereits ausgeführt
```

Späteres Re-Deploy: `npm run db:migrate` führt nur **neue** SQL-Dateien aus
(per SHA-256-Vergleich in `sebo.schema_migrations`).

---

## 5. Ersten Admin-User anlegen

```bash
docker exec -it vintage_app npm run db:admin

# Folgt interaktivem Prompt:
#   E-Mail:    bonjour@galeriedutemps.kz
#   Vorname:   <dein Name>
#   Passwort:  <starkes Passwort>
#   Rolle:     superadmin
```

---

## 6. Smoke-Tests

```bash
# 1. Health-Check
curl https://galeriedutemps.kz/api/health
# → {"ok":true,"db":"connected","timestamp":"…"}

# 2. Sitemap
curl https://galeriedutemps.kz/sitemap.xml | head -20

# 3. Admin-Login im Browser
#    https://galeriedutemps.kz/login
```

---

## 7. Stripe-Webhook registrieren

1. https://dashboard.stripe.com/webhooks → **+ Add endpoint**
2. URL: `https://galeriedutemps.kz/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `checkout.session.expired`
4. Signing secret kopieren → in `.env.local` als `STRIPE_WEBHOOK_SECRET`
5. Container neu starten: `docker compose restart app`

---

## 8. Cron-Jobs einrichten

```bash
crontab -e
# Folgendes anfügen:

# Täglich 02:00 — Affiliate-Provisionen offen→bestätigt nach 14 Tagen
0 2 * * * docker exec vintage_app npm run affiliate:confirm >> /var/log/affiliate-confirm.log 2>&1

# Sonntags 03:00 — alte Affiliate-Klicks (>90 Tage) löschen
0 3 * * 0 docker exec vintage_app npm run affiliate:cleanup >> /var/log/affiliate-cleanup.log 2>&1

# Täglich 03:00 — DB-Backup
0 3 * * * /opt/galeriedutemps/scripts/backup-db.sh >> /var/log/gdt-backup.log 2>&1
```

---

## 9. n8n initial konfigurieren

1. Browser: `https://n8n.galeriedutemps.kz`
2. Login mit `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` aus `.env.local`
3. Workflows importieren (z.B. „Lagerbestand-Alert", „Kontaktformular-Notify")
4. Webhook-URLs in `.env.local` eintragen (`N8N_KONTAKT_WEBHOOK_URL`, ...)
5. Container neu starten: `docker compose restart app`

---

## 10. Update-Workflow

```bash
cd /opt/galeriedutemps

# Neuen Code holen
git pull

# Container neu bauen + starten (mit Zero-Downtime per Rolling-Restart)
docker compose up -d --build app

# Neue Migrationen ausführen
docker exec vintage_app npm run db:migrate

# Logs prüfen
docker compose logs -f app
```

---

## 11. Backup-Wiederherstellung

```bash
# Liste verfügbarer Backups
ls -lh /var/backups/galeriedutemps/

# Restore (Beispiel)
/opt/galeriedutemps/scripts/restore-db.sh /var/backups/galeriedutemps/backup-2025-05-25.sql.gz
```

---

## 12. Monitoring (empfohlen)

- **Caddy-Logs:** `docker compose logs caddy --tail 100`
- **App-Logs:** `docker compose logs app --tail 100 -f`
- **DB-Größe:** `docker exec vintage_db psql -U vintage_user -d vintage_market -c "SELECT pg_size_pretty(pg_database_size('vintage_market'));"`
- **Container-Health:** `docker compose ps`
- **UptimeRobot/healthchecks.io** auf `/api/health` zeigen lassen

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| **502 Bad Gateway** | `docker compose logs app` — meistens fehlende ENV-Var oder DB-Verbindung |
| **TLS-Zertifikat-Fehler** | DNS noch nicht propagiert? `dig galeriedutemps.kz` prüfen. Caddy holt ACME-Cert nach DNS-Propagation automatisch nach. |
| **DB-Verbindung verweigert** | In `.env.local`: `DATABASE_URL` muss `@db:5432/…` (Docker-Service-Name) nutzen, NICHT `localhost` |
| **Migrations bleibt hängen** | `docker exec -it vintage_db psql -U vintage_user -d vintage_market` → `SELECT * FROM sebo.schema_migrations ORDER BY executed_am DESC LIMIT 5;` |
| **Stripe-Webhook 400** | Signing-Secret stimmt nicht — neu aus Dashboard kopieren |
| **„Kaspi noch nicht implementiert"** | Erwartet, bis Kaspi-Merchant-Account aktiv. Siehe `KASPI_SETUP.md` |

---

## Sicherheits-Checkliste vor Go-Live

- [ ] `.env.local` enthält keine Default-Werte mehr (`HIER_…`)
- [ ] `NEXTAUTH_SECRET` ist neu generiert (NICHT der Beispiel-Wert)
- [ ] `IBAN_ENCRYPTION_KEY` ist neu generiert + sicher gespeichert
  (Verlust = keine IBAN-Entschlüsselung mehr möglich!)
- [ ] `POSTGRES_PASSWORD` ist stark + nirgendwo committed
- [ ] Stripe ist im **Live**-Modus (`(Live-Modus-Key)`), nicht Test
- [ ] Webhook-Secret stimmt mit Dashboard überein
- [ ] DSGVO: Impressum + Datenschutz unter `/impressum` + `/datenschutz` ausgefüllt
- [ ] Cookie-Banner getestet (Affiliate-Tracking braucht Consent!)
- [ ] Admin-Passwort ist stark
- [ ] UFW-Firewall ist aktiv
- [ ] Backup-Cron läuft (1× testen!)
- [ ] Caddy-Logs werden rotiert (siehe `Caddyfile`)
