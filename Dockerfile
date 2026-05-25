# =============================================================================
# galeriedutemps · Multi-Stage Dockerfile
# Stage 1: deps     – npm ci (cached layer)
# Stage 2: builder  – next build
# Stage 3: runner   – minimales Production-Image (node:22-alpine)
# =============================================================================

# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:22-alpine AS deps

# Benötigt für native npm-Module (z.B. bcryptjs)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Nur package-Dateien zuerst kopieren → besseres Layer-Caching
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ─── Stage 2: Builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencies aus Stage 1 übernehmen
COPY --from=deps /app/node_modules ./node_modules

# Quellcode kopieren
COPY . .

# Build-Zeit: kein Telemetry, Production-Mode
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Platzhalter-Variablen für den Build (echte Werte kommen zur Laufzeit)
# next build benötigt NEXTAUTH_SECRET + DATABASE_URL nicht zwingend beim Build,
# aber NEXT_PUBLIC_* Variablen werden eingebettet – hier setzen falls nötig
ENV NEXT_PUBLIC_APP_URL=https://galeriedutemps.kz

RUN npm run build

# ─── Stage 3: Runner (minimales Production-Image) ───────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Sicherheit: Non-Root-User anlegen
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Upload-Verzeichnis mit korrekten Rechten
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Nur notwendige Build-Artefakte kopieren
COPY --from=builder /app/public                                    ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone    ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static        ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
