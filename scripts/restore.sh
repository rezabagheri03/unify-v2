#!/usr/bin/env bash
# scripts/restore.sh — Restore from a backup file.
# Usage: ./restore.sh <db-backup.sql.gz> [storage-backup.tar.gz]

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <db-backup.sql.gz> [storage-backup.tar.gz]"
  echo "Available DB backups:"
  ls -lh /var/backups/unify/db_*.sql.gz 2>/dev/null || echo "  (none)"
  echo ""
  echo "Available storage backups:"
  ls -lh /var/backups/unify/storage_*.tar.gz 2>/dev/null || echo "  (none)"
  exit 1
fi

DB_BACKUP="$1"
STORAGE_BACKUP="${2:-}"

echo "[$(date)] Starting restore from ${DB_BACKUP}..."

if [ ! -f "${DB_BACKUP}" ]; then
  echo "❌ DB backup file not found: ${DB_BACKUP}"
  exit 1
fi

# Confirm dangerous operation
read -p "⚠️  This will OVERWRITE the current database. Continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# 1. Restore database
echo "Restoring database..."
gunzip -c "${DB_BACKUP}" | psql "${DATABASE_URL}"
echo "✓ Database restored"

# 2. Restore storage
if [ -n "${STORAGE_BACKUP}" ] && [ -f "${STORAGE_BACKUP}" ]; then
  echo "Restoring storage..."
  STORAGE_PATH="${STORAGE_BASE_PATH:-./storage}"
  # Move current storage aside
  if [ -d "${STORAGE_PATH}" ]; then
    mv "${STORAGE_PATH}" "${STORAGE_PATH}.pre-restore.$(date +%s)"
  fi
  mkdir -p "$(dirname "${STORAGE_PATH}")"
  tar -xzf "${STORAGE_BACKUP}" -C "$(dirname "${STORAGE_PATH}")"
  echo "✓ Storage restored"
fi

echo "[$(date)] Restore complete. Restart services: docker-compose restart api web"
