#!/bin/sh
# ──────────────────────────────────────────────────────────────────────────────
# docker-entrypoint.sh
#
# Startet als root, fixt Volume-Permissions, dropt dann zu nextjs:nodejs.
#
# Hintergrund: Coolify (und Docker generell) mountet Persistent Volumes mit
# root:root 755 Default-Permissions. Unser App-User `nextjs` (UID 1001) hat
# damit keinen Schreibzugriff auf /app/public/uploads — jeder Bild-Upload
# scheitert mit EACCES.
#
# Lösung: Container startet root, wir chownen alle bekannten persistenten
# Pfade auf nextjs:nodejs, dann führen wir den eigentlichen CMD als nextjs aus.
# `su-exec` (Alpine-Variante von gosu) ist signal-safe — wichtig damit
# `docker stop` korrekt SIGTERM an die Node-App weiterleitet.
# ──────────────────────────────────────────────────────────────────────────────
set -e

# Pfade die persistente Volumes haben können
PERSIST_PATHS="/app/public/uploads"
if [ -n "$UPLOAD_DIR" ] && [ "$UPLOAD_DIR" != "/app/public/uploads" ]; then
  PERSIST_PATHS="$PERSIST_PATHS $UPLOAD_DIR"
fi

# Nur als root können wir chownen — wenn schon nextjs, springen wir gleich rein
if [ "$(id -u)" = "0" ]; then
  for p in $PERSIST_PATHS; do
    if [ -d "$p" ]; then
      # chown ist günstig wenn Owner schon stimmt, schadet nicht
      chown -R nextjs:nodejs "$p" 2>/dev/null || true
      chmod -R u+rwX,g+rwX "$p" 2>/dev/null || true
      echo "[entrypoint] $p → nextjs:nodejs (rwX)"
    else
      mkdir -p "$p" 2>/dev/null || true
      chown -R nextjs:nodejs "$p" 2>/dev/null || true
      echo "[entrypoint] $p (created) → nextjs:nodejs"
    fi
  done
  # Drop zu nextjs und exec den Original-CMD
  exec su-exec nextjs:nodejs "$@"
fi

# Bereits non-root → einfach weiter (z.B. dev-Modus)
exec "$@"
