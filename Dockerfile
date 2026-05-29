# =============================================================================
# galeriedutemps · Multi-Stage Dockerfile (Coolify-ready)
#
# Konventionen für Coolify + Caddy-Proxy:
#  - Lauscht auf 0.0.0.0:3000 (NICHT localhost)
#  - EXPOSE 3000
#  - HEALTHCHECK nutzt 127.0.0.1 (NICHT "localhost" → wäre IPv6 ::1)
#  - Standalone-Output (next.config.ts: output: "standalone") → minimales Image
# =============================================================================

# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Native Build-Tools für bcryptjs, sharp, etc.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Nur package-Dateien zuerst → besseres Layer-Caching
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# ─── BUILD-TIME ENV-VARS (NEXT_PUBLIC_*) ────────────────────────────────────
# Diese Werte werden ins JS-Bundle eingebettet — müssen schon BEIM BUILD da sein.
# In Coolify: als "Build Variable" / "Is Build Time?" markieren.
# Wenn nicht via Coolify gesetzt, nutzt der Build die Defaults aus ARG.
ARG NEXT_PUBLIC_APP_URL=https://galeriedutemps.kz
ARG NEXT_PUBLIC_UPLOAD_URL=/uploads
ARG NEXT_PUBLIC_DEFAULT_COUNTRY=KZ
ARG NEXT_PUBLIC_DEFAULT_LANGUAGE=ru
ARG NEXT_PUBLIC_DEFAULT_CURRENCY=KZT
ARG NEXT_PUBLIC_VAT_DEFAULT=12
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_UPLOAD_URL=${NEXT_PUBLIC_UPLOAD_URL}
ENV NEXT_PUBLIC_DEFAULT_COUNTRY=${NEXT_PUBLIC_DEFAULT_COUNTRY}
ENV NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE}
ENV NEXT_PUBLIC_DEFAULT_CURRENCY=${NEXT_PUBLIC_DEFAULT_CURRENCY}
ENV NEXT_PUBLIC_VAT_DEFAULT=${NEXT_PUBLIC_VAT_DEFAULT}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

RUN npm run build

# ─── Stage 3: Runner (minimales Production-Image) ───────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# wget ist in Alpine schon drin (BusyBox), aber sicherheitshalber.
# su-exec ist die Alpine-Variante von gosu — signal-safer User-Switch im Entrypoint.
RUN apk add --no-cache wget su-exec

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sicherheit: Non-Root-User (Drop passiert im Entrypoint via su-exec)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Upload-Verzeichnis vorbereiten — Coolify-Volume mounted darüber, der
# Entrypoint fixt Permissions nach dem Mount nochmal nach. Default-Pfad
# (ohne Volume) funktioniert dadurch auch.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

# Standalone-Build-Output
COPY --from=builder /app/public                                    ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone    ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static        ./.next/static

# Auto-Migrate beim Boot (opt-in via RUN_MIGRATIONS_ON_BOOT=true): der Migrations-
# Runner + die SQL-Dateien sind im Standalone-Output NICHT enthalten → explizit
# ins Runtime-Image kopieren. `pg` ist via App-Import bereits in node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/sql     ./sql

# Entrypoint-Script (chownt Volume als root, dropt zu nextjs:nodejs).
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# WICHTIG: KEIN `USER nextjs` hier — Entrypoint braucht root um Volume zu
# chownen. Drop zu nextjs:nodejs passiert per su-exec am Ende des Entrypoint.

EXPOSE 3000

# Healthcheck: 127.0.0.1 NICHT localhost (Alpine löst localhost zu ::1 auf
# und Next.js bindet nur IPv4 → Healthcheck schlägt fehl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# server.js wird von next.config.ts "output: standalone" erzeugt
# und respektiert PORT + HOSTNAME ENV-Variablen.
CMD ["node", "server.js"]
