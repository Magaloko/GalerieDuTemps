#!/bin/bash
# =============================================================================
# vintage-market · Datenbank-Restore-Script
# -----------------------------------------------------------------------------
# Verwendung:
#   ./restore-db.sh /var/backups/vintage-market/vm_2026-01-15_0300.sql.gz
# =============================================================================

set -euo pipefail

BACKUP="${1:?Usage: $0 <backup-file.sql.gz>}"
: "${POSTGRES_USER:?POSTGRES_USER nicht gesetzt}"
: "${POSTGRES_DB:?POSTGRES_DB nicht gesetzt}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD nicht gesetzt}"

if [ ! -f "$BACKUP" ]; then
    echo "✗ Backup-Datei nicht gefunden: $BACKUP"
    exit 1
fi

echo "⚠  WARNUNG: Die Datenbank '$POSTGRES_DB' wird vollständig überschrieben!"
read -p "Wirklich fortfahren? (yes/N) " bestaetigung
[ "$bestaetigung" = "yes" ] || { echo "Abgebrochen."; exit 1; }

echo "→ Stelle Backup wieder her: $BACKUP"
gunzip -c "$BACKUP" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" vintage_db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "✓ Restore abgeschlossen."
