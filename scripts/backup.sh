#!/usr/bin/env bash
# scripts/backup.sh — Automated backup for PostgreSQL + storage.
# Run daily via cron: 0 2 * * * /app/unify/scripts/backup.sh
# Golden Doc F.3: daily backups, 30-day retention.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/unify}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +"%Y-%m-%d_%H-%M")
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup..." | tee -a "${LOG_FILE}"

# 1. PostgreSQL dump
DB_DUMP="${BACKUP_DIR}/db_${DATE}.sql.gz"
if command -v pg_dump > /dev/null 2>&1; then
  pg_dump "${DATABASE_URL}" | gzip > "${DB_DUMP}"
  echo "✓ Database backup: ${DB_DUMP} ($(du -h "${DB_DUMP}" | cut -f1))" | tee -a "${LOG_FILE}"
else
  echo "⚠️  pg_dump not available — skipping DB backup" | tee -a "${LOG_FILE}"
fi

# 2. Storage directory backup (rsync to backup location)
STORAGE_BACKUP="${BACKUP_DIR}/storage_${DATE}.tar.gz"
if [ -d "${STORAGE_BASE_PATH:-./storage}" ]; then
  tar -czf "${STORAGE_BACKUP}" -C "$(dirname "${STORAGE_BASE_PATH}")" "$(basename "${STORAGE_BASE_PATH}")"
  echo "✓ Storage backup: ${STORAGE_BACKUP} ($(du -h "${STORAGE_BACKUP}" | cut -f1))" | tee -a "${LOG_FILE}"
else
  echo "⚠️  Storage directory not found — skipping" | tee -a "${LOG_FILE}"
fi

# 3. Cleanup old backups
echo "Cleaning backups older than ${RETENTION_DAYS} days..." | tee -a "${LOG_FILE}"
find "${BACKUP_DIR}" -type f -name "db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -type f -name "storage_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup complete." | tee -a "${LOG_FILE}"
