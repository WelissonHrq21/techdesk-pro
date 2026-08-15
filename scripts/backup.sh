#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-backups}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-techdesk}"
TIMESTAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_FILE_NAME="techdesk-${TIMESTAMP}.dump"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE_NAME}"
CONTAINER_BACKUP_FILE="/tmp/${BACKUP_FILE_NAME}"

mkdir -p "$BACKUP_DIR"

docker compose exec -T "$POSTGRES_SERVICE" pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -Fc \
  -f "$CONTAINER_BACKUP_FILE"

CONTAINER_ID="$(docker compose ps -q "$POSTGRES_SERVICE")"
docker cp "${CONTAINER_ID}:${CONTAINER_BACKUP_FILE}" "$BACKUP_FILE"
docker compose exec -T "$POSTGRES_SERVICE" rm -f "$CONTAINER_BACKUP_FILE" >/dev/null

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Backup file is empty: ${BACKUP_FILE}" >&2
  exit 1
fi

docker run --rm -v "$(pwd)/${BACKUP_DIR}:/backups" postgres:16 \
  pg_restore -l "/backups/${BACKUP_FILE_NAME}" >/dev/null

if command -v sha256sum >/dev/null 2>&1; then
  SHA256="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
else
  SHA256="$(shasum -a 256 "$BACKUP_FILE" | awk '{print $1}')"
fi

echo "Backup created at ${BACKUP_FILE}"
echo "SHA256: ${SHA256}"
