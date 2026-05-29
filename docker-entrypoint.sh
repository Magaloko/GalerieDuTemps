#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# docker-entrypoint.sh
#
# 1. Startet als root, fixt Volume-Permissions (Uploads), dropt dann zu nextjs.
# 2. OPTIONAL (opt-in): wendet DB-Migrationen beim Boot an, bevor die App startet.
#
# Volume-Permissions: Coolify mountet Persistent Volumes als root:root 755 →
# App-User `nextjs` (UID 1001) hätte keinen Schreibzugriff auf /app/public/uploads.
# Wir chownen daher als root und droppen per signal-safem `su-exec` zu nextjs.
#
# Auto-Migrate (Teil A): NUR wenn RUN_MIGRATIONS_ON_BOOT=true. Default AUS, weil
# das produktive sebo.schema_migrations den realen Stand widerspiegeln muss —
# sonst versucht der Runner bereits manuell eingespielte Migrationen erneut.
# VOR dem Aktivieren einmal prüfen, was liefe:
#   docker exec <container> node /app/scripts/db-migrate.mjs --dry-run
# Schlägt die Migration fehl → `set -e` bricht den Boot ab → Coolify behält die
# laufende alte Version (kein Serven gegen halb-migrierte DB).
# ──────────────────────────────────────────────────────────────────────────────
set -e

# Pfade die persistente Volumes haben können
PERSIST_PATHS="/app/public/uploads"
if [ -n "$UPLOAD_DIR" ] && [ "$UPLOAD_DIR" != "/app/public/uploads" ]; then
  PERSIST_PATHS="$PERSIST_PATHS $UPLOAD_DIR"
fi

# Auto-Migrate (opt-in). Erstes Arg = optionaler User-Prefix (z.B. "su-exec nextjs:nodejs").
run_migrations() {
  if [ "$RUN_MIGRATIONS_ON_BOOT" != "true" ]; then
    return 0
  fi
  if [ ! -f /app/scripts/db-migrate.mjs ]; then
    echo "[entrypoint] WARN: /app/scripts/db-migrate.mjs fehlt — Auto-Migrate übersprungen"
    return 0
  fi
  echo "[entrypoint] RUN_MIGRATIONS_ON_BOOT=true → DB-Migrationen anwenden ..."
  "$@" node /app/scripts/db-migrate.mjs
  echo "[entrypoint] Migrationen abgeschlossen."
}

# Nur als root können wir chownen — wenn schon nextjs, springen wir gleich rein
if [ "$(id -u)" = "0" ]; then
  for p in $PERSIST_PATHS; do
    if [ -d "$p" ]; then
      chown -R nextjs:nodejs "$p" 2>/dev/null || true
      chmod -R u+rwX,g+rwX "$p" 2>/dev/null || true
      echo "[entrypoint] $p → nextjs:nodejs (rwX)"
    else
      mkdir -p "$p" 2>/dev/null || true
      chown -R nextjs:nodejs "$p" 2>/dev/null || true
      echo "[entrypoint] $p (created) → nextjs:nodejs"
    fi
  done

  # Migrationen als nextjs-User (least privilege), DANN App als nextjs starten.
  run_migrations su-exec nextjs:nodejs
  exec su-exec nextjs:nodejs "$@"
fi

# Bereits non-root → einfach weiter (z.B. dev-Modus)
run_migrations
exec "$@"
