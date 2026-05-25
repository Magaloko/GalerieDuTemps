#!/bin/bash
# =============================================================================
# galeriedutemps · Datenbank-Backup-Script
# -----------------------------------------------------------------------------
# Erstellt komprimierte pg_dump-Backups + Rotation (Behalte letzte 14 Tage)
#
# Verwendung (per Cron, täglich 03:00 Uhr):
#   0 3 * * * /opt/galeriedutemps/scripts/backup-db.sh >> /var/log/vm-backup.log 2>&1
# =============================================================================

set -euo pipefail

# ─── Konfiguration ───────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/var/backups/galeriedutemps}"
BEHALTE_TAGE="${BEHALTE_TAGE:-14}"
TIMESTAMP="$(date +%Y-%m-%d_%H%M)"
DATEINAME="vm_${TIMESTAMP}.sql.gz"

# ─── DB-Credentials (aus Docker Compose .env) ────────────────────────────────
: "${POSTGRES_USER:?POSTGRES_USER nicht gesetzt}"
: "${POSTGRES_DB:?POSTGRES_DB nicht gesetzt}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD nicht gesetzt}"

# ─── Backup erstellen ────────────────────────────────────────────────────────
echo "[$(date)] Starte Backup → $BACKUP_DIR/$DATEINAME"
mkdir -p "$BACKUP_DIR"

# Im Docker-Container ausführen, Output direkt komprimieren
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" vintage_db \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --no-owner --no-acl --clean --if-exists \
    | gzip -9 > "$BACKUP_DIR/$DATEINAME"

GROESSE="$(du -h "$BACKUP_DIR/$DATEINAME" | cut -f1)"
echo "[$(date)] ✓ Backup erstellt: $GROESSE"

# ─── Rotation: alte Backups löschen ──────────────────────────────────────────
ENTFERNT="$(find "$BACKUP_DIR" -name 'vm_*.sql.gz' -mtime "+$BEHALTE_TAGE" -print -delete | wc -l)"
if [ "$ENTFERNT" -gt 0 ]; then
    echo "[$(date)] $ENTFERNT alte Backups entfernt (älter als $BEHALTE_TAGE Tage)"
fi

# ─── Optional: Upload zu Remote-Storage ──────────────────────────────────────
if [ -n "${REMOTE_BACKUP_URL:-}" ]; then
    echo "[$(date)] Lade Backup zu Remote hoch …"
    # Beispiel mit rclone (vorher konfigurieren: rclone config)
    # rclone copy "$BACKUP_DIR/$DATEINAME" "$REMOTE_BACKUP_URL"
fi

echo "[$(date)] Fertig."
