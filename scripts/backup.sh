#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-backups}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-techdesk}"
TIMESTAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/techdesk-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

docker compose exec -T "$POSTGRES_SERVICE" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  > "$BACKUP_FILE"

echo "Backup created at ${BACKUP_FILE}"
