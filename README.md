# Galerie du Temps

Vintage-Marktplatz mit Next.js 16, PostgreSQL, NextAuth v5 und DeepSeek KI-Assistent.

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript · Tailwind 4
- **PostgreSQL 16** (Schema `sebo.*`)
- **NextAuth v5** (Credentials + bcrypt, JWT-Sessions)
- **DeepSeek API** (KI-Assistent mit Tool-Calling)
- **Brevo HTTP API** + **N8N SMTP** (E-Mails)
- **Docker Compose** auf Hostinger VPS, **Caddy** als TLS-Reverse-Proxy

## Schnellstart (lokal)

```bash
# 1. Dependencies
npm install

# 2. Umgebung konfigurieren
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET, DEEPSEEK_API_KEY etc. setzen

# 3. PostgreSQL starten (Docker)
docker compose up db -d

# 4. Admin-Account anlegen
npm run db:admin

# 5. Dev-Server
npm run dev
```

→ http://localhost:3000 (Public)  ·  http://localhost:3000/admin (Login)

## Produktion (Hostinger VPS)

```bash
# 1. Repo klonen
git clone <repo-url> /opt/vintage-market && cd /opt/vintage-market

# 2. .env.local mit Produktionswerten anlegen
cp .env.example .env.local && nano .env.local

# 3. Alle Services starten
docker compose up -d

# 4. Admin anlegen (im laufenden App-Container)
docker exec -it vintage_app node scripts/create-admin.mjs

# 5. Caddy holt automatisch das TLS-Zertifikat von Let's Encrypt
#    → https://galeriedutemps.kz live
```

## NPM Scripts

| Script | Zweck |
|---|---|
| `npm run dev` | Dev-Server (Turbopack) |
| `npm run build` | Production Build |
| `npm run start` | Production Server |
| `npm run db:admin` | Interaktiv Admin-User anlegen |
| `npm run db:generate-secret` | NEXTAUTH_SECRET generieren |

## Backups

Tägliche Backups via Cron auf dem VPS:

```cron
# /etc/cron.d/vintage-market-backup
0 3 * * * root /opt/vintage-market/scripts/backup-db.sh >> /var/log/vm-backup.log 2>&1
```

Restore:
```bash
./scripts/restore-db.sh /var/backups/vintage-market/vm_2026-01-15_0300.sql.gz
```

## Struktur

```
src/
├── app/
│   ├── (public)/        # Katalog, Detail, Kategorien, Kontakt, Wunschliste, About
│   ├── (admin)/         # Dashboard, Produkte, Statistiken, Preisanalyse, Kontakt
│   ├── (auth)/login/    # Login
│   ├── api/             # REST + /api/ai/chat (DeepSeek Tool-Calling)
│   ├── sitemap.ts       # Dynamische Sitemap aus DB
│   ├── robots.ts
│   ├── not-found.tsx    # 404 mit Vintage-Design
│   └── error.tsx
├── components/          # ui/, layout/, produkte/, ai/, charts/
├── lib/
│   ├── db/              # PostgreSQL Queries
│   ├── auth/            # NextAuth Config
│   ├── ai/              # DeepSeek Client + Tools + Handler
│   ├── email/           # Brevo Client + Templates
│   ├── storage/         # File Uploads
│   └── utils/           # Slug, Preis, Validierung, Rate-Limit
├── hooks/               # useChat, useWunschliste
└── types/

sql/                     # Initial-Schema (auto bei DB-Start)
scripts/                 # CLI: create-admin, backup-db, restore-db
docker-compose.yml       # app + db + caddy + n8n
Caddyfile                # TLS + Reverse Proxy
```

## Rate-Limits (per IP)

| Endpoint | Limit | Fenster |
|---|---|---|
| `/api/kontakt`  | 3   | 10 Min |
| `/api/ai/chat`  | 20  | 1 Min  |
| `/api/suche`    | 60  | 1 Min  |

## Routen-Übersicht

```
Public:  /  /katalog  /katalog/[slug]  /kategorien/[slug]
         /about  /kontakt  /wunschliste

Auth:    /login

Admin:   /admin  (Dashboard)
         /admin/produkte  /admin/produkte/neu  /admin/produkte/[id]
         /admin/produkte/[id]/bilder
         /admin/statistiken  /admin/preisanalyse  /admin/kontakt

API:     /api/produkte  /api/bilder  /api/kategorien
         /api/kontakt  /api/wunschliste  /api/suche
         /api/statistiken  /api/ai/chat  /api/auth/*  /api/health
```
